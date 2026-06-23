#!/bin/sh
# Start script for Docker container — runs nginx + backend

# Start nginx in background
nginx -g 'daemon off;' &

# Start the Express backend
cd /app && node src/index.js &

# Wait for either process to exit
wait -n
exit $?