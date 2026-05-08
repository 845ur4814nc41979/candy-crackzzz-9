#!/usr/bin/env bash
set -euo pipefail

fail() {
  echo "$1"
  exit 1
}

active_start="$(grep -v '^[[:space:]]*#' scripts/replit-start.sh || true)"

echo "$active_start" | grep -q "@workspace/candy-crackzzz run dev" && fail "scripts/replit-start.sh must NOT start Vite. Candy CrackZZZ web artifact owns port 5001."
echo "$active_start" | grep -q "@workspace/api-server run dev" && fail "scripts/replit-start.sh must NOT start API. API artifact owns port 3001."
echo "$active_start" | grep -q "artifact-router" && fail "scripts/replit-start.sh must NOT manually start Replit artifact-router."

grep -q 'runButton = "Start application"' .replit || fail ".replit must use runButton = Start application."
grep -q 'waitForPort = 5000' .replit || fail ".replit Start application must wait for port 5000."

grep -q 'localPort = 5001' artifacts/candy-crackzzz/.replit-artifact/artifact.toml || fail "Frontend artifact must use localPort = 5001."
grep -q 'PORT = "5001"' artifacts/candy-crackzzz/.replit-artifact/artifact.toml || fail "Frontend artifact must set PORT = 5001."
grep -q 'FRONTEND_PORT = "5001"' artifacts/candy-crackzzz/.replit-artifact/artifact.toml || fail "Frontend artifact must set FRONTEND_PORT = 5001."
grep -q 'API_PORT = "3001"' artifacts/candy-crackzzz/.replit-artifact/artifact.toml || fail "Frontend artifact must set API_PORT = 3001."

grep -q 'localPort = 3001' artifacts/api-server/.replit-artifact/artifact.toml || fail "API artifact must use localPort = 3001."
grep -q 'PORT = "3001"' artifacts/api-server/.replit-artifact/artifact.toml || fail "API artifact must set PORT = 3001."

grep -q 'proxy-server.cjs' scripts/replit-start.sh || fail "Start application must start proxy-server.cjs on 5000."

echo "Replit startup architecture validation passed."
