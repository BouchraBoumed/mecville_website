-- =============================================================
-- Mecville Storage Bucket + Policies
-- Run this AFTER 001_schema.sql in the Supabase SQL Editor
-- =============================================================

-- 1. Create the product-images storage bucket (public, 50MB max, images only)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  52428800,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

-- 2. Public read access for product images
create policy "Public can view product images"
  on storage.objects for select
  using (bucket_id = 'product-images');

-- 3. Admins can upload product images
create policy "Admins can upload product images"
  on storage.objects for insert
  with check (
    bucket_id = 'product-images'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 4. Admins can update product images
create policy "Admins can update product images"
  on storage.objects for update
  using (
    bucket_id = 'product-images'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 5. Admins can delete product images
create policy "Admins can delete product images"
  on storage.objects for delete
  using (
    bucket_id = 'product-images'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- =============================================================
-- Fix: Order items insert policy should be restricted to the
-- order owner, not any authenticated user.
-- =============================================================

-- Drop the overly permissive policy
drop policy if exists "System can insert order items" on public.order_items;

-- Replace with a policy that only allows the order owner to insert
create policy "Users can insert own order items"
  on public.order_items for insert
  with check (
    exists (
      select 1 from public.orders
      where id = order_id
      and (user_id = auth.uid()
           or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
    )
  );

-- Also allow the backend service role to insert (for payment webhook flows)
-- The service role bypasses RLS entirely, so this is covered automatically.
