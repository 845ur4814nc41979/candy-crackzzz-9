# Candy CrackZZZ 8.4 — Replit Import Fix & Architecture Reference

Run `bash scripts/diagnose-replit.sh` first whenever something breaks.

---

## Final port architecture

| Port | Role | Managed by |
|------|------|-----------|
| **5000** | Embedded Replit Preview proxy/webview | `scripts/proxy-server.cjs` via `scripts/replit-start.sh` |
| **5001** | Vite dev server / public artifact URL | `artifacts/candy-crackzzz: web` artifact workflow |
| **3001** | Express / API server | `artifacts/api-server: API Server` artifact workflow |

The proxy on **5000** binds immediately so the Replit IDE preview pane sees an open port fast, then forwards HTTP/WebSocket to Vite on **5001**.

The public `picard.replit.dev` URL is routed by Replit's native artifact-router, which the platform starts automatically when the `artifacts/candy-crackzzz: web` workflow runs.

---

## Rules

- Do **NOT** start Vite or API from `scripts/replit-start.sh`.
- Do **NOT** start Replit artifact-router from `scripts/replit-start.sh`.
- Do **NOT** add duplicate workflows.
- Do **NOT** switch Vite to port 5000.
- Do **NOT** remove `FRONTEND_PORT=5001`.

---

## Symptom guide

### Embedded Preview is white

- Check proxy 5000.
- Check Vite 5001.
- If Vite 5001 is down, start/restart `artifacts/candy-crackzzz: web`.
- Do not add Vite startup to `scripts/replit-start.sh`.

### Public URL is 502

- Check the artifact web workflow and public routing.
- Do not touch React first.

### API calls fail

- Check `artifacts/api-server: API Server`.
- Do not add API startup to `scripts/replit-start.sh`.

### Future Agent tries to launch everything from Start application

- Reject it.
- It creates port conflicts.
- It breaks artifact workflows.

---

## Default login

- Username: `owner`
- Password: `CandyCrackzzzTemp1!`
