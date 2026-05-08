#!/usr/bin/env bash
set -euo pipefail

# Candy CrackZZZ 8.4 — self-healing Replit startup
#
# Final rule:
#   3001 = API server
#   5001 = Vite frontend
#   5000 = Preview proxy
#
# This script starts missing services only.
# It does not blindly start duplicates.
# It does not manually start Replit artifact-router.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

API_PORT="${API_PORT:-3001}"
FRONTEND_PORT="${FRONTEND_PORT:-5001}"
PREVIEW_PROXY_PORT="${PREVIEW_PROXY_PORT:-5000}"
VITE_TARGET_PORT="${VITE_TARGET_PORT:-5001}"

LOCK_DIR="/tmp/candy-crackzzz-start.lock"

is_up() {
  curl -fsS "$1" >/dev/null 2>&1
}

wait_for() {
  local label="$1"
  local url="$2"
  local max="${3:-60}"
  local count=0

  echo "Waiting for $label..."
  until is_up "$url"; do
    count=$((count + 1))
    if [ "$count" -ge "$max" ]; then
      echo "Timed out waiting for $label at $url"
      return 1
    fi
    sleep 1
  done
  echo "$label is up."
}

free_proxy_port_only() {
  local pids=""
  if command -v lsof >/dev/null 2>&1; then
    pids="$(lsof -ti tcp:"$PREVIEW_PROXY_PORT" 2>/dev/null || true)"
  fi

  if [ -n "$pids" ]; then
    echo "Freeing preview proxy port $PREVIEW_PROXY_PORT only (pids: $pids)..."
    echo "$pids" | xargs kill -9 2>/dev/null || true
    sleep 1
  fi
}

if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  echo "Another Candy CrackZZZ startup is already running."
  echo "Waiting for preview proxy on $PREVIEW_PROXY_PORT..."
  while ! is_up "http://127.0.0.1:${PREVIEW_PROXY_PORT}/"; do
    sleep 1
  done
  echo "Preview proxy is available. Holding workflow alive."
  tail -f /dev/null
fi

cleanup() {
  kill "${API_PID:-}" 2>/dev/null || true
  kill "${VITE_PID:-}" 2>/dev/null || true
  kill "${PROXY_PID:-}" 2>/dev/null || true
  rmdir "$LOCK_DIR" 2>/dev/null || true
}

trap cleanup EXIT

echo "Installing dependencies..."
pnpm install

if [ -n "${DATABASE_URL:-}" ]; then
  echo "Creating/updating database tables..."
  pnpm --filter @workspace/db run push
else
  echo "DATABASE_URL not set — using file-storage fallback."
fi

echo "Checking API on $API_PORT..."
if is_up "http://127.0.0.1:${API_PORT}/api/cc/bootstrap"; then
  echo "API already running on $API_PORT. Not starting duplicate."
else
  echo "API is down. Starting API on $API_PORT..."
  PORT="$API_PORT" API_PORT="$API_PORT" pnpm --filter @workspace/api-server run dev &
  API_PID=$!
fi

echo "Checking Vite website on $FRONTEND_PORT..."
if is_up "http://127.0.0.1:${FRONTEND_PORT}/"; then
  echo "Vite already running on $FRONTEND_PORT. Not starting duplicate."
else
  echo "Vite is down. Starting Candy CrackZZZ website on $FRONTEND_PORT..."
  FRONTEND_PORT="$FRONTEND_PORT" PORT="$FRONTEND_PORT" API_PORT="$API_PORT" pnpm --filter @workspace/candy-crackzzz run dev &
  VITE_PID=$!
fi

wait_for "API" "http://127.0.0.1:${API_PORT}/api/cc/bootstrap" 60
wait_for "Vite website" "http://127.0.0.1:${FRONTEND_PORT}/" 60

free_proxy_port_only

echo "Starting preview proxy $PREVIEW_PROXY_PORT -> $VITE_TARGET_PORT..."
PREVIEW_PROXY_PORT="$PREVIEW_PROXY_PORT" VITE_TARGET_PORT="$VITE_TARGET_PORT" node scripts/proxy-server.cjs &
PROXY_PID=$!

echo "Candy CrackZZZ is up:"
echo "  API:     http://127.0.0.1:${API_PORT}/api/cc/bootstrap"
echo "  Website: http://127.0.0.1:${FRONTEND_PORT}/"
echo "  Preview: http://127.0.0.1:${PREVIEW_PROXY_PORT}/"

wait "$PROXY_PID"
