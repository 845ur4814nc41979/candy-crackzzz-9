#!/usr/bin/env bash
set -euo pipefail

# Candy CrackZZZ 8.4 — Replit embedded Preview starter
#
# FINAL RULE:
# Start application owns ONLY the embedded Preview proxy on port 5000.
#
# Port ownership:
#   5000 = Start application preview proxy
#   5001 = artifacts/candy-crackzzz: web workflow / Vite frontend
#   3001 = artifacts/api-server: API Server workflow
#
# Do NOT start Vite here.
# Do NOT start API here.
# Do NOT manually start Replit artifact-router here.
#
# If the Candy CrackZZZ Website preview is down, start/restart:
#   artifacts/candy-crackzzz: web
#
# If API is down, start/restart:
#   artifacts/api-server: API Server

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PREVIEW_PROXY_PORT="${PREVIEW_PROXY_PORT:-5000}"
VITE_TARGET_PORT="${VITE_TARGET_PORT:-5001}"

LOCK_DIR="/tmp/candy-crackzzz-start.lock"

is_up() {
  curl -fsS "$1" >/dev/null 2>&1
}

freeport() {
  local port="$1"
  local pids=""
  if command -v lsof >/dev/null 2>&1; then
    pids="$(lsof -ti tcp:"$port" 2>/dev/null || true)"
  fi
  if [ -n "$pids" ]; then
    echo "Freeing port $port (pids: $pids)..."
    echo "$pids" | xargs kill -9 2>/dev/null || true
    sleep 1
  fi
}

if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  echo "Another Start application workflow is already running."
  echo "Waiting for preview proxy on port ${PREVIEW_PROXY_PORT}..."
  while ! is_up "http://127.0.0.1:${PREVIEW_PROXY_PORT}/"; do
    sleep 1
  done
  echo "Preview proxy is available. Holding workflow alive."
  tail -f /dev/null
fi

cleanup() {
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

# Only free the proxy port. Do not touch 5001 or 3001.
freeport "${PREVIEW_PROXY_PORT}"

echo "Starting embedded Preview proxy ${PREVIEW_PROXY_PORT} -> Vite ${VITE_TARGET_PORT}..."
PREVIEW_PROXY_PORT="${PREVIEW_PROXY_PORT}" VITE_TARGET_PORT="${VITE_TARGET_PORT}" node scripts/proxy-server.cjs &
PROXY_PID=$!

echo "Start application is proxy-only and healthy if port ${PREVIEW_PROXY_PORT} responds."
echo "Candy CrackZZZ Website preview requires artifacts/candy-crackzzz: web on port 5001."
echo "API requires artifacts/api-server: API Server on port 3001."

wait "$PROXY_PID"
