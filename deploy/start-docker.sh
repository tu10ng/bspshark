#!/usr/bin/env bash
set -euo pipefail
mkdir -p /app/data

DATABASE_URL="${DATABASE_URL:-sqlite://data/bspshark.db}" \
  BACKEND_PORT="${BACKEND_PORT:-8080}" \
  FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}" \
  ./backend &

HOSTNAME=0.0.0.0 PORT="${FRONTEND_PORT:-3000}" \
  BACKEND_URL="${BACKEND_URL:-http://localhost:8080}" \
  node frontend/server.js &

wait -n
