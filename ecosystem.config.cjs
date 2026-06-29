/**
 * PM2 Ecosystem Configuration for Mecville
 *
 * Manages the Express backend as a persistent process with auto-restart,
 * log rotation, and cluster mode for production.
 *
 * Usage:
 *   pm2 start ecosystem.config.cjs --env production
 *   pm2 status          # check process status
 *   pm2 logs mecville   # view logs
 *   pm2 restart mecville
 *   pm2 stop mecville
 *
 * Save process list for auto-restart on reboot:
 *   pm2 save
 *   pm2 startup         # follow instructions to enable boot script
 */

module.exports = {
  apps: [
    {
      name: 'mecville-api',
      script: 'src/index.js',
      cwd: './back-end',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '512M',

      // Environment variables loaded from back-end/.env
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },

      // Auto-restart on crash
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 5000,

      // Log files
      error_file: './logs/mecville-error.log',
      out_file: './logs/mecville-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 10000,
    },
  ],
};