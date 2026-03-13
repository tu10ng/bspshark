#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

PACKAGE="${1:-}"

if [ -z "$PACKAGE" ] || [ ! -f "$PACKAGE" ]; then
  echo "Usage: ./update.sh <bspshark-linux-x64.tar.gz>"
  exit 1
fi

echo "=== Stopping services... ==="
./stop.sh 2>/dev/null || true

echo "=== Backing up data... ==="
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
[ -f data/bspshark.db ] && cp data/bspshark.db "$BACKUP_DIR/"
[ -f .env ] && cp .env "$BACKUP_DIR/"
echo "Backup saved to $BACKUP_DIR/"

echo "=== Extracting update... ==="
# Extract to temp directory
TMP_DIR=$(mktemp -d)
tar -xzf "$PACKAGE" -C "$TMP_DIR"
SRC="$TMP_DIR/bspshark"

# Replace binaries and frontend (preserve .env, data/, logs/, backups/)
cp "$SRC/backend" ./backend
[ -f "$SRC/node" ] && cp "$SRC/node" ./node
rm -rf frontend && cp -r "$SRC/frontend" ./frontend
rm -rf migrations && cp -r "$SRC/migrations" ./migrations
cp "$SRC/start.sh" "$SRC/stop.sh" "$SRC/update.sh" ./
chmod +x start.sh stop.sh update.sh backend
[ -f node ] && chmod +x node

# Notify if config template changed
if ! diff -q "$SRC/.env.example" .env.example >/dev/null 2>&1; then
  cp "$SRC/.env.example" .env.example
  echo "NOTE: .env.example has changed. Check for new config options."
fi

rm -rf "$TMP_DIR"

echo "=== Restarting services... ==="
./start.sh

echo "=== Update complete! ==="
