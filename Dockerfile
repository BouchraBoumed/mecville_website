# ── Build stage: compile frontend ───────────────────────────
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend
COPY front-end/package.json front-end/package-lock.json* ./
RUN npm ci --ignore-scripts || npm install --ignore-scripts
COPY front-end/ .
# Create placeholder .env for build (real env vars are set at runtime via browser)
RUN echo "VITE_SUPABASE_URL=placeholder" > .env && \
    echo "VITE_SUPABASE_PUBLISHABLE_KEY=placeholder" >> .env && \
    echo "VITE_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder" >> .env
RUN npm run build

# ── Production stage: serve frontend + backend ──────────────
FROM node:20-alpine AS production

# Install nginx for serving static files + reverse proxy
RUN apk add --no-cache nginx

WORKDIR /app

# Copy backend
COPY back-end/package.json back-end/package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev
COPY back-end/ ./

# Copy frontend build output
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

# Copy nginx config
COPY deploy/nginx.conf /etc/nginx/http.d/default.conf

# Copy startup script
COPY deploy/start.sh /app/start.sh
RUN chmod +x /app/start.sh

EXPOSE 80

CMD ["/app/start.sh"]