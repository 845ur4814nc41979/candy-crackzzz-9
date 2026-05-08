#!/usr/bin/env bash
set -uo pipefail

echo "Candy CrackZZZ 8.4 Replit Diagnostic"
echo "====================================="
echo
echo "Expected architecture:"
echo "  5000 = Start application embedded Preview proxy"
echo "  5001 = artifact web workflow Vite frontend"
echo "  3001 = API artifact workflow"
echo
echo "Do not fix 5001/3001 failures by adding Vite/API startup to scripts/replit-start.sh. Start/restart the artifact workflows instead."
echo

section() {
  echo
  echo "========== $1 =========="
}

check_url() {
  local label="$1"
  local url="$2"
  echo "--- $label: $url ---"
  curl -si "$url" --max-time 8 | sed -n '1,8p' || true
}

section "1. Git state"
git status --short || true
git log --oneline --max-count=5 || true

section "2. Important environment values"
printenv | sort | grep -E "FRONTEND_PORT|API_PORT|PORT=|PREVIEW_PROXY|VITE_TARGET|REPLIT_HELIUM|REPLIT_IN_MICROVM|REPLIT_DEV_DOMAIN|REPLIT_ARTIFACT_ROUTER" | sed 's/=.*/=<set>/' || true

section "3. Running processes"
pgrep -af "artifact-router|proxy-server|vite|api-server|replit-start|node --enable-source-maps|pnpm" || true
echo
echo "Note: artifact-router may only be visible inside the native artifact workflow context."

section "4. Local port checks"
check_url "embedded Preview proxy/webview" "http://127.0.0.1:5000/"
check_url "artifact/Vite frontend" "http://127.0.0.1:5001/"
check_url "API bootstrap" "http://127.0.0.1:3001/api/cc/bootstrap"

section "5. Failure interpretation"
echo "If 5000 works but 5001 fails: Start application proxy is running but frontend artifact workflow is down."
echo "If 5001 works but 3001 fails: frontend is running but API artifact workflow is down."
echo "If Start application launches Vite/API, that is wrong."
echo "If artifact workflow fails due to port in use, check whether Start application was incorrectly changed to launch Vite/API."

section "6. Public URL check"
if [ -n "${REPLIT_DEV_DOMAIN:-}" ]; then
  check_url "public Replit dev URL" "https://${REPLIT_DEV_DOMAIN}/"
else
  echo "REPLIT_DEV_DOMAIN not set in this shell."
  echo "Manually test the public picard.replit.dev URL from the browser."
fi

section "7. Artifact port alignment"
echo "--- Frontend artifact ---"
grep -n "localPort\|PORT\|FRONTEND_PORT\|API_PORT" artifacts/candy-crackzzz/.replit-artifact/artifact.toml || true
echo

echo "--- API artifact ---"
grep -n "localPort\|PORT\|API_PORT" artifacts/api-server/.replit-artifact/artifact.toml || true

echo
echo "Expected:"
echo "  frontend artifact localPort/PORT/FRONTEND_PORT = 5001"
echo "  api artifact localPort/PORT/API_PORT = 3001"

section "8. Startup script checks"
echo "Manual artifact-router startup should NOT be active in scripts/replit-start.sh."
grep -n "REPLIT_ARTIFACT_ROUTER\|artifact-router\|pnpm --filter @workspace/candy-crackzzz run dev\|pnpm --filter @workspace/api-server run dev" scripts/replit-start.sh || true
echo
echo "Preview proxy is expected in this 8.4 working architecture:"
grep -n "proxy-server\|PREVIEW_PROXY_PORT\|VITE_TARGET_PORT" scripts/replit-start.sh || true

section "9. Diagnosis guide"
cat <<'GUIDE'
If public URL is HTTP 502 but local 5000/5001/3001 work:
  - Do not touch React.
  - Check the native artifacts/candy-crackzzz: web workflow.
  - Check frontend artifact localPort = 5001.
  - Check API artifact localPort/PORT = 3001.
  - Restart the native artifact workflow.

If embedded Preview is broken but public URL works:
  - Check Start application workflow.
  - Check scripts/replit-start.sh.
  - Check proxy-server on 5000 and Vite on 5001.

If public URL returns HTTP 200 but blank white:
  - Inspect browser console.
  - Check #root.
  - Check main.tsx and AppContext/bootstrap.
GUIDE
