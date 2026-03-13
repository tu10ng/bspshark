#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

for svc in backend frontend; do
  pid_file="pids/$svc.pid"
  if [ -f "$pid_file" ]; then
    pid=$(cat "$pid_file")
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid"
      echo "Stopped $svc (PID $pid)"
    else
      echo "$svc not running (stale PID $pid)"
    fi
    rm -f "$pid_file"
  else
    echo "$svc: no PID file"
  fi
done
