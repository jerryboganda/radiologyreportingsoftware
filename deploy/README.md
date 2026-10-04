# Production runbook: https://radiology.polytronx.com

**Where it runs:** shared VPS `185.252.233.186` (`ssh vps`), `/opt/docker/polytronx-radiology`, container `polytronx-radiology-app` on the Docker network `platform`. No published ports: Nginx Proxy Manager (proxy host id 48, Let's Encrypt cert id 51, auto-renewing) forwards `radiology.polytronx.com` to `polytronx-radiology-app:4321`; Cloudflare sits in front.

**Sign-in:** HTTP Basic Auth. User `radiology`, password in `/opt/docker/polytronx-radiology/.env` (`BASIC_AUTH_PASS`, mode 600) and in the git-ignored `start-worker-production.cmd` on the reporting PC. Only `/api/health` is open.

## Update the app
1. Push to `main`. GitHub Actions (`.github/workflows/image.yml`) builds and pushes `ghcr.io/jerryboganda/radiologyreportingsoftware:latest`. The VPS never builds.
2. On the VPS: `cd /opt/docker/polytronx-radiology && docker compose pull && docker compose up -d`.
3. Check: `AUTH_PASS=... node scripts/auth-check.mjs https://radiology.polytronx.com` (read-only).

## Change the password
Edit `.env` on the VPS, run `docker compose up -d`, then update `start-worker-production.cmd` on the PC and restart the worker.

## AI engine
The AI reads each note on the reporting PC, not on the server (the CLI logins live there): run `start-worker-production.cmd`. It downloads each note photo over HTTPS, runs the selected engine (gy = Gemini 3.8 Flash High, or opencode with the chosen model), and posts the draft back. When the PC or worker is off, uploads wait as "Queued" and the app shows "AI engine offline".

## Wording check
The app compares every serious medical term and number in a draft with the senior's note and refuses to issue a PDF until the resident confirms any wording the senior did not write (`src/lib/wording.ts`; the server enforces it in `/api/pdf/<id>`). Run `npm run check:wording` after editing the word list; the checks `check:api`, `check:auth` and `check:ui` cover the rest.

## Data
`data/` (SQLite) and `uploads/` (patient note photos) live next to the compose file. Back both up before changes; nothing here is backed up automatically.

## Never
Never publish ports for this container, never commit `.env`, the database, uploads or the launcher, and never run `docker compose build` on the VPS.
