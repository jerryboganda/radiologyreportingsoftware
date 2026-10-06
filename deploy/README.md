# Production runbook: https://radiology.polytronx.com

**Where it runs:** shared VPS `185.252.233.186` (`ssh vps`), `/opt/docker/polytronx-radiology`, container `polytronx-radiology-app` on the Docker network `platform`. No published ports: Nginx Proxy Manager (proxy host id 48, Let's Encrypt cert id 51, auto-renewing) forwards `radiology.polytronx.com` to `polytronx-radiology-app:4321`; Cloudflare sits in front.

**Sign-in:** HTTP Basic Auth. User `radiology`, password in `/opt/docker/polytronx-radiology/.env` (`BASIC_AUTH_PASS`, mode 600) and in the git-ignored `start-worker-production.cmd` on the reporting PC. Only `/api/health` is open.

## Update the app
1. Push to `main`. GitHub Actions (`.github/workflows/image.yml`) builds and pushes `ghcr.io/jerryboganda/radiologyreportingsoftware:latest`. The VPS never builds.
2. On the VPS: `cd /opt/docker/polytronx-radiology && docker compose pull && docker compose up -d`.
3. Check: `AUTH_PASS=... node scripts/auth-check.mjs https://radiology.polytronx.com` (read-only).

## Change the password
Edit `.env` on the VPS, run `docker compose up -d`, then update `start-worker-production.cmd` on the PC and restart the worker.

## AI engine (runs on the VPS, 24/7)
The `worker` container (`polytronx-radiology-worker`, same image as the app) claims queued cases over the internal network and runs both engines server-side, so reports process even when the reporting PC is off:
- **antigravity**: the `agy` CLI baked into the image (linux-x64, from Google's updater manifest). Its Google sign-in (AI Pro subscription quota — never API billing) lives in `./agy-home` + `./agy-keyrings` next to the compose file; the entrypoint starts a session dbus and unlocks the keyring with `KEYRING_PASSWORD` from the `.env`.
- **opencode**: direct HTTPS to the OpenCode Go gateway (`https://opencode.ai/zen/go/v1`) with `OPENCODE_API_KEY` from the `.env`.

Engine and model follow the app's Settings; both are always available server-side. The reporting PC's own worker (`start-worker-production.cmd`, autostart task) keeps running as redundancy — jobs are claimed one at a time, so both can coexist safely.

### One-time worker seeding (already done 6 Oct 2026)
`./agy-home` holds the signed-in agy state (`~/.gemini` files incl. `antigravity-cli/antigravity-oauth-token`); `./agy-keyrings` holds the Secret Service store (`login.keyring`, `user.keystore`), encrypted with `KEYRING_PASSWORD`. Both are chowned 1000:1000. If the sign-in ever needs redoing: delete both dirs, run the agy sign-in interactively in a throwaway container (mount them at `/home/node/.gemini` and `/home/node/.local/share/keyrings`, with `dbus` + `gnome-keyring` installed, unlock with the `.env` password, choose Google OAuth, paste the authorization code from the callback page), then chown again.

### Rulebook edits
The worker reads `AGENTS.md` from inside its image. Rulebook edits apply on the next image build: commit + push to `main` (the workflow no longer ignores `AGENTS.md` or `scripts/**` for this reason) and `docker compose pull && up -d` as usual.

## Wording check
The app compares every serious medical term and number in a draft with the senior's note and refuses to issue a PDF until the resident confirms any wording the senior did not write (`src/lib/wording.ts`; the server enforces it in `/api/pdf/<id>`). Run `npm run check:wording` after editing the word list; the checks `check:api`, `check:auth` and `check:ui` cover the rest.

## Data
`data/` (SQLite) and `uploads/` (patient note photos) live next to the compose file. Back both up before changes; nothing here is backed up automatically.

## Never
Never publish ports for this container, never commit `.env`, the database, uploads or the launcher, and never run `docker compose build` on the VPS.
