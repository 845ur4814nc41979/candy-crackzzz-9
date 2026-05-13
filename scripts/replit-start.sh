#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

API_PORT="${API_PORT:-3001}"
PREVIEW_PROXY_PORT="${PREVIEW_PROXY_PORT:-5000}"
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

free_port() {
  local port="$1"
  local label="$2"
  local pids=""

  if command -v lsof >/dev/null 2>&1; then
    pids="$(lsof -ti tcp:"$port" 2>/dev/null || true)"
  fi

  if [ -n "$pids" ]; then
    echo "Freeing $label port $port (pids: $pids)..."
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

echo "Building Candy CrackZZZ frontend..."
pnpm --filter @workspace/candy-crackzzz run build

free_port "$API_PORT" "API/static website"
free_port "$PREVIEW_PROXY_PORT" "preview proxy"
free_port 5001 "old Vite dev server"

echo "Starting API + built website on $API_PORT..."
PORT="$API_PORT" API_PORT="$API_PORT" NODE_ENV=development pnpm --filter @workspace/api-server run dev &
API_PID=$!

wait_for "API" "http://127.0.0.1:${API_PORT}/api/cc/bootstrap" 60
wait_for "Built website" "http://127.0.0.1:${API_PORT}/" 60

echo "Starting preview proxy $PREVIEW_PROXY_PORT -> $API_PORT..."
PREVIEW_PROXY_PORT="$PREVIEW_PROXY_PORT" VITE_TARGET_PORT="$API_PORT" node scripts/proxy-server.cjs &
PROXY_PID=$!

wait_for "Preview" "http://127.0.0.1:${PREVIEW_PROXY_PORT}/" 60

echo "Candy CrackZZZ is up:"
echo "  API:     http://127.0.0.1:${API_PORT}/api/cc/bootstrap"
echo "  Website: http://127.0.0.1:${API_PORT}/"
echo "  Preview: http://127.0.0.1:${PREVIEW_PROXY_PORT}/"
echo "Use the normal Replit Start application Preview."

wait "$PROXY_PID"
