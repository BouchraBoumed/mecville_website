import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy /api to Express backend
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // Proxy /wp-json to WordPress (for backward compatibility during migration)
      '/wp-json': {
        target: 'http://localhost:8881',
        changeOrigin: true,
      },
      '/wp-content': {
        target: 'http://localhost:8881',
        changeOrigin: true,
      },
    },
  },
});
