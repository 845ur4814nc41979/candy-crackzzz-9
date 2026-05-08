#!/usr/bin/env bash
set -euo pipefail

fail() {
  echo "$1"
  exit 1
}

grep -q 'artifact-router' scripts/replit-start.sh && fail "Do not manually start Replit artifact-router."

grep -q 'localPort = 5000' artifacts/candy-crackzzz/.replit-artifact/artifact.toml || fail "Candy website artifact should point to localPort 5000 proxy."
grep -q 'run = "bash scripts/replit-start.sh"' artifacts/candy-crackzzz/.replit-artifact/artifact.toml || fail "Candy website artifact should use scripts/replit-start.sh."
grep -q 'FRONTEND_PORT = "5001"' artifacts/candy-crackzzz/.replit-artifact/artifact.toml || fail "Frontend target must remain 5001."
grep -q 'API_PORT = "3001"' artifacts/candy-crackzzz/.replit-artifact/artifact.toml || fail "API target must remain 3001."

grep -q '@workspace/api-server run dev' scripts/replit-start.sh || fail "Startup script should be able to start API if missing."
grep -q '@workspace/candy-crackzzz run dev' scripts/replit-start.sh || fail "Startup script should be able to start Vite if missing."
grep -q 'proxy-server.cjs' scripts/replit-start.sh || fail "Startup script must start preview proxy."

echo "Replit startup architecture validation passed."
