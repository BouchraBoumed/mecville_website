# Mecville — Production Deployment Guide

## Architecture

```
User → nginx (port 80/443)
         ├── /api/* → Express backend (port 3001, PM2)
         └── /*     → React static files (front-end/dist/)
                      → Supabase (PostgreSQL + Auth + Storage)
                      → Stripe / PayPal APIs
```

| Component | Technology | Port |
|-----------|-----------|------|
| Frontend | React 18 + Vite (static build) | 80/443 (nginx) |
| Backend | Express.js | 3001 |
| Database | Supabase (PostgreSQL) | hosted |
| Auth | Supabase Auth | hosted |
| Payments | Stripe + PayPal | hosted |
| Process Manager | PM2 | — |

## Option A: VPS Deployment (Ubuntu/Debian)

### Step 1: Install Node.js + PM2 + nginx

```bash
# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 (process manager)
sudo npm install -g pm2

# nginx
sudo apt-get install -y nginx

# Certbot for SSL
sudo apt-get install -y certbot python3-certbot-nginx
```

### Step 2: Clone and install

```bash
cd /var/www
git clone <your-repo> mecville
cd mecville

# Install dependencies
npm install                    # root (concurrently)
cd front-end && npm install && cd ..
cd back-end && npm install && cd ..
```

### Step 3: Configure environment variables

```bash
cp front-end/.env.example front-end/.env
cp back-end/.env.example back-end/.env
```

Edit **both** `.env` files with your real credentials (see SUPABASE_SETUP.md):

**front-end/.env** — set Supabase URL, anon key, Stripe publishable key
**back-end/.env** — set all credentials, and change:
```
CORS_ORIGIN=https://mecville.com
NODE_ENV=production
```

### Step 4: Run database migrations

Follow **SUPABASE_SETUP.md** to:
1. Create your Supabase project
2. Run `001_schema.sql` and `002_storage_bucket.sql` in the SQL Editor
3. Optionally run `seed.sql` for sample data
4. Get your API keys and put them in `.env`

### Step 5: Build the frontend

```bash
cd front-end
npm run build
# Output goes to front-end/dist/
```

### Step 6: Deploy frontend to nginx

```bash
sudo mkdir -p /var/www/mecville/frontend
sudo cp -r front-end/dist /var/www/mecville/frontend/dist
```

### Step 7: Configure nginx

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/mecville
sudo ln -s /etc/nginx/sites-available/mecville /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # remove default site
sudo nginx -t
sudo systemctl reload nginx
```

### Step 8: Start the backend with PM2

```bash
cd /var/www/mecville
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup    # follow instructions to enable auto-restart on reboot
```

### Step 9: Obtain SSL certificate

```bash
sudo certbot --nginx -d mecville.com -d www.mecville.com
# Certbot automatically modifies nginx config and sets up auto-renewal
```

### Step 10: Verify

```bash
# Backend health check
curl https://mecville.com/api/health
# Should return: {"status":"ok","timestamp":"..."}

# Frontend
curl https://mecville.com/
# Should return HTML

# PM2 status
pm2 status
```

### Step 11: Make yourself admin

Sign up through the website, then run in Supabase SQL Editor:
```sql
update profiles set role = 'admin' where email = 'your-email@example.com';
```

---

## Option B: Docker Deployment

```bash
# Create back-end/.env (front-end env is baked at build time)
cp back-end/.env.example back-end/.env
# Edit with real credentials

# Build and start
docker compose up -d --build

# Check status
docker compose ps
docker compose logs -f

# SSL: use a reverse proxy (Caddy, Traefik) or certbot on the host
```

For Docker, the frontend env vars are set at build time. To change them, edit `front-end/.env` and rebuild:
```bash
docker compose up -d --build
```

---

## Updating the Site

### Frontend changes:
```bash
cd /var/www/mecville/front-end
git pull
npm install        # if dependencies changed
npm run build
sudo cp -r dist /var/www/mecville/frontend/dist
# No restart needed — nginx serves static files
```

### Backend changes:
```bash
cd /var/www/mecville
git pull
cd back-end && npm install
pm2 restart mecville-api
```

### Database migrations:
Run new SQL files in the Supabase SQL Editor.

---

## Monitoring

```bash
# PM2 logs
pm2 logs mecville-api

# PM2 monitor (CPU, memory)
pm2 monit

# nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Check SSL certificate expiry
sudo certbot certificates
```

### Error Tracking (optional — Sentry)

1. Create a project at https://sentry.io (Node.js)
2. `cd back-end && npm install @sentry/node`
3. Add `SENTRY_DSN=your-dsn` to `back-end/.env`
4. `pm2 restart mecville-api`

All 500 errors will automatically be sent to Sentry with request context.

---

## Troubleshooting

### Blank page after deploy
- Check that `front-end/dist/` contains `index.html`
- Check nginx error log: `sudo tail /var/log/nginx/error.log`
- Verify nginx config: `sudo nginx -t`

### API returns 502 Bad Gateway
- Backend not running: `pm2 status` — should show "online"
- Check backend logs: `pm2 logs mecville-api`
- Verify port 3001 is not in use: `lsof -i :3001`

### CORS errors in browser
- Check `CORS_ORIGIN` in `back-end/.env` matches your domain exactly
- Restart backend: `pm2 restart mecville-api`

### Payment webhooks not received
- Verify webhook URL is reachable: `https://mecville.com/api/webhooks/stripe`
- Check Stripe dashboard → Webhooks → your endpoint → recent events
- Verify `STRIPE_WEBHOOK_SECRET` matches the signing secret from Stripe

### Cart/checkout errors
- Verify Supabase keys are correct (anon key in frontend, service_role in backend)
- Check that database migrations were applied (tables exist)
- Verify the `product-images` storage bucket exists in Supabase

---

## Monthly Cost

| Item | Cost |
|------|------|
| VPS (e.g., Hetzner CX21) | ~$5 CAD/mo |
| Supabase (free tier) | $0 |
| Stripe | 2.9% + $0.30 per transaction |
| PayPal | 3.49% + fixed fee per transaction |
| Domain | ~$15 CAD/year |
| PM2, nginx, Certbot | $0 |
| **Total fixed** | **~$6 CAD/mo** |
