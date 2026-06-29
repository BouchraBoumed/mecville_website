-- =============================================================
-- Mecville E-Commerce Database Schema
-- PostgreSQL for Supabase
-- =============================================================
-- AFTER RUNNING THIS SQL, ALSO CREATE THE STORAGE BUCKET:
-- 1. Go to Supabase Dashboard → Storage → New bucket
-- 2. Name: "product-images", Public bucket: ON, Allowed MIME types: image/png, image/jpeg, image/webp
-- OR run this SQL in the SQL editor:
--   insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
--   values ('product-images', 'product-images', true, 52428800, array['image/png', 'image/jpeg', 'image/webp']);
-- 3. Then add Storage RLS policies:
--   -- Public read
--   create policy "Public can view product images"
--     on storage.objects for select
--     using (bucket_id = 'product-images');
--   -- Admin insert/update
--   create policy "Admins can upload product images"
--     on storage.objects for insert
--     with check (
--       bucket_id = 'product-images'
--       and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
--     );
--   create policy "Admins can delete product images"
--     on storage.objects for delete
--     using (
--       bucket_id = 'product-images'
--       and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
--     );
-- =============================================================

-- 0. Extensions
create extension if not exists "pgcrypto";

-- 1. Profiles (extends Supabase Auth)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  first_name  text,
  last_name   text,
  phone       text,
  avatar_url  text,
  role        text not null default 'customer' check (role in ('customer', 'admin')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 2. Categories
create table if not exists public.categories (
  id          bigserial primary key,
  name        text not null,
  slug        text not null unique,
  description text,
  image_url   text,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 3. Products
create table if not exists public.products (
  id                bigserial primary key,
  name              text not null,
  slug              text not null unique,
  description       text,
  short_description text,
  price             numeric(10,2) not null check (price >= 0),
  compare_price     numeric(10,2) check (compare_price >= 0),
  cost_price        numeric(10,2) check (cost_price >= 0),
  sku               text,
  barcode           text,
  stock             int not null default 0 check (stock >= 0),
  stock_alert       int not null default 5,
  weight            numeric(8,2),
  category_id       bigint references public.categories(id) on delete set null,
  images            jsonb not null default '[]'::jsonb,
  attributes        jsonb not null default '{}'::jsonb,
  featured          boolean not null default false,
  active            boolean not null default true,
  meta_title        text,
  meta_description  text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_products_active on public.products(active);
create index idx_products_featured on public.products(featured) where featured = true;
create index idx_products_category on public.products(category_id);
create index idx_products_slug on public.products(slug);

-- 4. Cart Items
create table if not exists public.cart_items (
  id          bigserial primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  product_id  bigint not null references public.products(id) on delete cascade,
  quantity    int not null default 1 check (quantity > 0 and quantity <= 99),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique(user_id, product_id)
);

create index idx_cart_user on public.cart_items(user_id);

-- 5. Orders
create table if not exists public.orders (
  id                bigserial primary key,
  order_number      text not null unique,
  user_id           uuid references public.profiles(id) on delete set null,
  email             text not null,
  status            text not null default 'pending' check (status in ('pending','processing','shipped','delivered','cancelled','refunded')),
  payment_status    text not null default 'pending' check (payment_status in ('pending','paid','failed','refunded')),
  payment_method    text,
  payment_id        text,
  subtotal          numeric(10,2) not null,
  shipping_cost     numeric(10,2) not null default 0,
  tax               numeric(10,2) not null default 0,
  discount          numeric(10,2) not null default 0,
  total             numeric(10,2) not null,
  currency          text not null default 'CAD',
  notes             text,
  billing_address   jsonb not null,
  shipping_address  jsonb not null,
  shipping_method   text,
  tracking_number   text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_orders_user on public.orders(user_id);
create index idx_orders_status on public.orders(status);
create index idx_orders_created on public.orders(created_at desc);

-- 6. Order Items
create table if not exists public.order_items (
  id            bigserial primary key,
  order_id      bigint not null references public.orders(id) on delete cascade,
  product_id    bigint references public.products(id) on delete set null,
  name          text not null,
  sku           text,
  price         numeric(10,2) not null,
  quantity      int not null,
  total         numeric(10,2) not null,
  image_url     text,
  created_at    timestamptz not null default now()
);

create index idx_order_items_order on public.order_items(order_id);

-- 7. Reviews
create table if not exists public.reviews (
  id          bigserial primary key,
  product_id  bigint not null references public.products(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  rating      int not null check (rating >= 1 and rating <= 5),
  title       text,
  content     text,
  active      boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique(product_id, user_id)
);

create index idx_reviews_product on public.reviews(product_id);
create index idx_reviews_active on public.reviews(active) where active = true;

-- 8. Contact Messages
create table if not exists public.contact_messages (
  id          bigserial primary key,
  name        text not null,
  email       text not null,
  subject     text,
  message     text not null,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

-- =============================================================
-- FUNCTIONS
-- =============================================================

-- Decrement stock atomically (with check)
create or replace function public.decrement_stock(product_id bigint, qty int)
returns void
language plpgsql
security definer
as $$
begin
  update public.products
  set stock = stock - qty
  where id = product_id
    and stock >= qty;

  if not found then
    raise exception 'Insufficient stock for product %', product_id;
  end if;
end;
$$;

-- Increment stock (for refunds/cancellations)
create or replace function public.increment_stock(product_id bigint, qty int)
returns void
language plpgsql
security definer
as $$
begin
  update public.products
  set stock = stock + qty
  where id = product_id;
end;
$$;

-- Get stock alert threshold
create or replace function public.get_stock_alert_threshold()
returns int
language sql
stable
as $$
  select 5;
$$;

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================

-- Profiles
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Admins can view all profiles"
  on public.profiles for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Admins can update all profiles"
  on public.profiles for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Categories (public read, admin write)
alter table public.categories enable row level security;

create policy "Public can view categories"
  on public.categories for select
  using (true);

create policy "Admins can insert categories"
  on public.categories for insert
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Admins can update categories"
  on public.categories for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Admins can delete categories"
  on public.categories for delete
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Products (public read active, admin write)
alter table public.products enable row level security;

create policy "Public can view active products"
  on public.products for select
  using (active = true);

create policy "Admins can view all products"
  on public.products for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Admins can insert products"
  on public.products for insert
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Admins can update products"
  on public.products for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Admins can delete products"
  on public.products for delete
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Cart Items (user owns their cart)
alter table public.cart_items enable row level security;

create policy "Users manage own cart"
  on public.cart_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Orders (user views own, admin views all)
alter table public.orders enable row level security;

create policy "Users can view own orders"
  on public.orders for select
  using (auth.uid() = user_id);

create policy "Admins can view all orders"
  on public.orders for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Users can insert own orders"
  on public.orders for insert
  with check (auth.uid() = user_id);

create policy "Admins can update orders"
  on public.orders for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Order Items (view via order access)
alter table public.order_items enable row level security;

create policy "Users can view own order items"
  on public.order_items for select
  using (exists (select 1 from public.orders where id = order_id and user_id = auth.uid()));

create policy "Admins can view all order items"
  on public.order_items for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "System can insert order items"
  on public.order_items for insert
  with check (exists (select 1 from public.orders where id = order_id));

-- Reviews
alter table public.reviews enable row level security;

create policy "Public can view active reviews"
  on public.reviews for select
  using (active = true);

create policy "Admins can view all reviews"
  on public.reviews for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Authenticated users can create reviews"
  on public.reviews for insert
  with check (auth.uid() = user_id);

create policy "Users can update own reviews"
  on public.reviews for update
  using (auth.uid() = user_id);

create policy "Admins can manage all reviews"
  on public.reviews for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Contact Messages (public can insert, admin can read)
alter table public.contact_messages enable row level security;

create policy "Public can submit contact messages"
  on public.contact_messages for insert
  with check (true);

create policy "Admins can view contact messages"
  on public.contact_messages for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Admins can update contact messages"
  on public.contact_messages for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- =============================================================
-- TRIGGERS
-- =============================================================

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, last_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    coalesce(new.raw_user_meta_data ->> 'role', 'customer')
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Auto-update updated_at
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at_profiles
  before update on public.profiles
  for each row
  execute function public.update_updated_at();

create trigger set_updated_at_products
  before update on public.products
  for each row
  execute function public.update_updated_at();

create trigger set_updated_at_categories
  before update on public.categories
  for each row
  execute function public.update_updated_at();

create trigger set_updated_at_cart_items
  before update on public.cart_items
  for each row
  execute function public.update_updated_at();

create trigger set_updated_at_orders
  before update on public.orders
  for each row
  execute function public.update_updated_at();

create trigger set_updated_at_reviews
  before update on public.reviews
  for each row
  execute function public.update_updated_at();

-- Generate order number
create or replace function public.generate_order_number()
returns trigger
language plpgsql
as $$
begin
  new.order_number = 'MCV-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(md5(random()::text), 1, 6));
  return new;
end;
$$;

create trigger set_order_number
  before insert on public.orders
  for each row
  execute function public.generate_order_number();
