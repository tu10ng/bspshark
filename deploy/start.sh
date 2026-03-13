#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo "No .env found. Copying from .env.example..."
  cp .env.example .env
fi
source .env

# Prefer bundled ./node, fall back to system node
NODE_BIN="./node"
if [ ! -x "$NODE_BIN" ]; then
  NODE_BIN="node"
fi

BACKEND_PORT="${BACKEND_PORT:-8080}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
mkdir -p pids data logs

echo "Starting backend on port $BACKEND_PORT..."
DATABASE_URL="$DATABASE_URL" BACKEND_PORT="$BACKEND_PORT" \
  FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}" \
  nohup ./backend > logs/backend.log 2>&1 &
echo $! > pids/backend.pid

echo "Starting frontend on port $FRONTEND_PORT..."
HOSTNAME=0.0.0.0 PORT="$FRONTEND_PORT" \
  BACKEND_URL="${BACKEND_URL:-http://localhost:8080}" \
  nohup "$NODE_BIN" frontend/server.js > logs/frontend.log 2>&1 &
echo $! > pids/frontend.pid

echo "Started! Backend :$BACKEND_PORT | Frontend :$FRONTEND_PORT"
echo "Logs: logs/backend.log, logs/frontend.log"
