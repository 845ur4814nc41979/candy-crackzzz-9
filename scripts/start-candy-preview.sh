#!/bin/bash
set -euo pipefail

if [ ! -d node_modules ]; then
  pnpm install
fi

export CANDY_FORCE_FILE_STORAGE=1
export PORT=3001

pnpm --filter @workspace/api-server run dev > /tmp/candy-api.log 2>&1 &
API_PID=$!

cleanup() {
  kill "$API_PID" 2>/dev/null || true
}

trap cleanup EXIT

PORT=3000 pnpm --filter @workspace/candy-crackzzz run dev