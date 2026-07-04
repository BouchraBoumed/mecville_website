# Mecville - Pokemon TCG Store

E-commerce storefront for Pokemon TCG singles, sealed products, graded cards, and bundles.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Backend | Express.js |
| Database | Supabase (PostgreSQL) |
| Payments | Stripe + PayPal |
| Auth | Supabase Auth |

## Prerequisites

- Node.js 18+
- Supabase project (free tier works)
- Stripe and/or PayPal accounts for payments

## Setup

### 1. Clone and install dependencies

```bash
# Root
npm install

# Frontend
cd front-end && npm install && cd ..

# Backend
cd back-end && npm install && cd ..
```

### 2. Configure environment variables

Copy the example files and fill in your credentials:

```bash
cp front-end/.env.example front-end/.env
cp back-end/.env.example back-end/.env
```

**front-end/.env** — required:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

**back-end/.env** — required:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=your-secret-key
SUPABASE_PUBLISHABLE_KEY=your-publishable-key
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
CORS_ORIGIN=http://localhost:5173
```

### 3. Database setup

Run the following in your Supabase SQL editor to create the schema:

```sql
-- Profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  role TEXT DEFAULT 'customer',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  image JSONB DEFAULT '[]',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Products
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  short_description TEXT,
  price NUMERIC(10,2) DEFAULT 0,
  compare_price NUMERIC(10,2),
  sku TEXT,
  stock INT DEFAULT 0,
  stock_alert INT DEFAULT 5,
  active BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,
  category_id UUID REFERENCES categories(id),
  images JSONB DEFAULT '[]',
  attributes JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Cart items
CREATE TABLE cart_items (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  product_id UUID REFERENCES products(id) NOT NULL,
  quantity INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users,
  order_number TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  email TEXT,
  status TEXT DEFAULT 'pending',
  payment_status TEXT DEFAULT 'pending',
  payment_method TEXT DEFAULT 'stripe',
  payment_id TEXT,
  subtotal NUMERIC(10,2) DEFAULT 0,
  shipping_cost NUMERIC(10,2) DEFAULT 0,
  tax NUMERIC(10,2) DEFAULT 0,
  discount NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) DEFAULT 0,
  billing_address JSONB DEFAULT '{}',
  shipping_address JSONB DEFAULT '{}',
  tracking_number TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Order items
CREATE TABLE order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  name TEXT,
  price NUMERIC(10,2),
  quantity INT,
  total NUMERIC(10,2),
  image_url TEXT
);

-- Contact messages
CREATE TABLE contact_messages (
  id BIGSERIAL PRIMARY KEY,
  name TEXT,
  email TEXT,
  subject TEXT,
  message TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Reviews
CREATE TABLE reviews (
  id BIGSERIAL PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  content TEXT,
  active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Decrement stock function
CREATE OR REPLACE FUNCTION decrement_stock(product_id UUID, qty INT)
RETURNS VOID AS $$
BEGIN
  UPDATE products SET stock = GREATEST(stock - qty, 0) WHERE id = product_id;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can read their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can manage their cart" ON cart_items FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can read their orders" ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can read their order items" ON order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
);
CREATE POLICY "Users can create reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anyone can read approved reviews" ON reviews FOR SELECT USING (active = true);
```

## Running the App

### Start both services (development)

```bash
# From the root directory, start both backend and frontend:
cd back-end && npm run dev & cd front-end && npm run dev
```

Or in separate terminals:

```bash
# Terminal 1 — Backend (port 3001)
cd back-end
npm run dev

# Terminal 2 — Frontend (port 5173)
cd front-end
npm run dev
```

The frontend proxies `/api` requests to the backend automatically.

### Production build

```bash
cd front-end
npm run build     # outputs to dist/

cd back-end
npm start         # serves on port 3001
```

The `front-end/dist/` build is a static SPA — host it on any static host (Vercel, Netlify, etc.) and point API requests to your backend URL via `VITE_API_URL`.

### Production deployment

The project is configured for **frontend on Vercel** and **backend on Render**.
See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for the full step-by-step guide.

- Frontend (`front-end/`) — Vercel SPA. Set `VITE_API_URL` to the Render
  backend URL (e.g. `https://mecville-api.onrender.com/api`).
- Backend (`back-end/`) — Render Web Service. Set `CORS_ORIGIN` to your
  Vercel URL. `render.yaml` at the repo root defines the service spec.

## Testing

### Backend (15 tests)
```bash
cd back-end
npm test
```

### Frontend e2e (26 tests)
```bash
cd front-end
npx playwright test
```

## Project Structure

```
mecville_webiste-1/
├── front-end/                  # React SPA
│   ├── src/
│   │   ├── api/                # Supabase + backend API clients
│   │   ├── components/         # Shared UI (Header, Footer, Cards, Seo)
│   │   ├── contexts/           # Auth context
│   │   ├── lib/                # Supabase client init
│   │   ├── pages/              # Route pages (15 routes)
│   │   └── styles/             # CSS design system
│   └── tests/                  # Playwright e2e specs
├── back-end/                   # Express API
│   └── src/
│       ├── routes/             # payments, webhooks, contact, admin
│       ├── services/           # Stripe, PayPal, Email
│       ├── middleware/         # Auth, validation, rate limiting
│       └── __tests__/          # Vitest + supertest specs
├── render.yaml                 # Render Blueprint (backend web service)
└── DEPLOYMENT.md               # Vercel (frontend) + Render (backend) guide
```
