# Supabase Production Setup Guide

Follow these steps **in order** to configure your Supabase project for production.

## Step 1: Create a Supabase Project

1. Go to https://supabase.com → New Project
2. Name it "Mecville" 
3. Set a strong database password (save it somewhere secure)
4. Choose a region close to your users (e.g., `Toronto` for Canada)
5. Wait for provisioning to complete (~2 minutes)

## Step 2: Run Database Migrations

1. Go to **SQL Editor** in the Supabase dashboard
2. Open `back-end/supabase/migrations/001_schema.sql` from this project
3. Paste the entire contents into the SQL Editor
4. Click **Run**
5. Verify no errors — you should see "Success. No rows returned."

Repeat for the second migration:
1. Open `back-end/supabase/migrations/002_storage_bucket.sql`
2. Paste and **Run**
3. This creates the storage bucket and fixes the order_items RLS policy

## Step 3: Seed Initial Data (Optional)

If you want the sample products for testing:
1. Open `back-end/supabase/seed.sql`
2. Paste and **Run** in the SQL Editor
3. This adds 4 categories and 8 sample products with placeholder images

## Step 4: Get Your API Keys

1. Go to **Settings → API**
2. Copy these values — you'll need them for `.env` files:

| Key | Where it goes |
|-----|---------------|
| Project URL | Both `front-end/.env` and `back-end/.env` |
| anon public key | `front-end/.env` as `VITE_SUPABASE_PUBLISHABLE_KEY` |
| service_role secret key | `back-end/.env` as `SUPABASE_SECRET_KEY` |
| anon public key | `back-end/.env` as `SUPABASE_PUBLISHABLE_KEY` |

⚠️ **NEVER expose the service_role key in the frontend.** It bypasses RLS.

## Step 5: Configure Auth Settings

1. Go to **Authentication → Providers**
2. **Email** provider: Make sure it's enabled
3. Go to **Authentication → Settings**:
   - Set **Site URL** to your production URL (e.g., `https://mecville.com`)
   - Add **Redirect URLs**: 
     - `http://localhost:5173` (development)
     - `https://mecville.com` (production)
   - Set **Email Confirmations**: ON (recommended for production)
   - Set **Minimum Password Length**: 8

## Step 6: Create the Admin User

After your first user signs up through the app:

1. Go to **SQL Editor**
2. Run this SQL to make yourself an admin:
```sql
update public.profiles
set role = 'admin'
where email = 'your-email@example.com';
```

## Step 7: Verify Storage Bucket

1. Go to **Storage** in the dashboard
2. You should see a `product-images` bucket (public, 50MB limit)
3. Click it → try uploading a test image to verify the policies work

## Step 8: Configure Stripe Webhooks

1. Go to https://dashboard.stripe.com/webhooks
2. Click **Add endpoint**
3. Set URL to: `https://api.mecville.com/api/webhooks/stripe` (or your backend URL)
4. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copy the **Signing Secret** → put it in `back-end/.env` as `STRIPE_WEBHOOK_SECRET`

## Step 9: Configure PayPal Webhooks (if using PayPal)

1. Go to https://developer.paypal.com/dashboard/applications
2. Select your app → **Add Webhook**
3. Set URL to: `https://api.mecville.com/api/webhooks/paypal`
4. Select event types:
   - `PAYMENT.CAPTURE.COMPLETED`
   - `PAYMENT.CAPTURE.DENIED`
   - `PAYMENT.CAPTURE.REFUNDED`
5. Copy the **Webhook ID** → put it in `back-end/.env` as `PAYPAL_WEBHOOK_ID`

## Troubleshooting

### "permission denied for schema public"
Make sure you ran the migrations in order and there were no errors.

### "JWT claims: role 'authenticated' not found"
The user's JWT token is invalid or expired. Make sure the frontend is using the `anon public` key, not the `service_role` key.

### Cart insert fails with "null value in column user_id"
This should now be fixed — the schema has `DEFAULT auth.uid()` and the frontend passes `user_id` explicitly. If you still see this, verify the user is logged in before adding to cart.