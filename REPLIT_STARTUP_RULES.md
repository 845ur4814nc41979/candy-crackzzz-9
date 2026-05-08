Candy CrackZZZ 8.4 Replit startup rule:

Start application is proxy-only.
Do not start Vite or API from scripts/replit-start.sh.

Port ownership:
- 5000 = Start application proxy
- 5001 = artifacts/candy-crackzzz: web
- 3001 = artifacts/api-server: API Server

If embedded Preview is white:
- check proxy 5000 and Vite 5001
- if Vite 5001 is down, start/restart artifacts/candy-crackzzz: web
- do not add Vite startup to Start application

If public URL is 502:
- check artifact workflow/public routing
- do not touch React first

If API calls fail:
- check artifacts/api-server workflow
- do not add API startup to Start application

If a future Agent wants to “fix” the start script by launching all services:
- reject that change
- it creates port conflicts
- it breaks artifact workflows
