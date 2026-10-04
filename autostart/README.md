# Autostart at logon (and stay running)

Three Windows Scheduled Tasks keep PolytronX alive on this PC. They fire when you sign in
(`DESKTOP-ISMR85K\Dr Faisal Maqsood PC`), run hidden, and watch their process forever: whatever
makes the app server or a worker exit is relaunched after 15 seconds. They have no time limit.

| Task | Starts | Target |
|---|---|---|
| `PolytronX local server` | `autostart/polytronx-server.vbs` | app on http://127.0.0.1:4321 |
| `PolytronX local AI worker` | `autostart/polytronx-worker-local.vbs` | `scripts/queue_worker.mjs` → http://127.0.0.1:4321 |
| `PolytronX production AI worker` | `autostart/polytronx-worker-production.vbs` | `start-worker-production.cmd` → https://radiology.polytronx.com |

The production task reuses `start-worker-production.cmd` as-is, so the password still exists in
exactly one file (that file is git-ignored — keep it that way).

The workers also refuse to run twice: `.worker/worker.lock` and `.worker-prod/worker.lock`
record the running PID, and a second copy — started by hand or by the task — prints
"another worker ... already running" and exits. The lock is PID-checked, so a crashed worker's
stale lock is taken over automatically. The local pieces speak to `127.0.0.1`, never `localhost`:
another project's dev server (e.g. lightbox) can squat `[::1]:4321` and intercept.

## Output and health

Each process writes a log into `logs/` (`server.log`, `worker-local.log`,
`worker-production.log`); a log is deleted and recreated once it passes 5 MB.

## Stopping one on purpose

The watcher relaunches a killed process, so disable the task first, then end what is running:

    schtasks /change /DISABLE /TN "PolytronX local AI worker"     (then kill the node process)
    schtasks /change /ENABLE  /TN "PolytronX local AI worker"     (and schtasks /run /TN ... to start again)

Same for the other two tasks. To stop everything until the next sign-in: disable all three, then
`taskkill /F /IM node.exe` (careful — that kills every node process, including other projects').

## Reinstall after moving this folder or renaming the PC

    schtasks /create /TN "PolytronX local server"         /XML autostart/polytronx-server.xml /F
    schtasks /create /TN "PolytronX local AI worker"      /XML autostart/polytronx-worker-local.xml /F
    schtasks /create /TN "PolytronX production AI worker" /XML autostart/polytronx-worker-production.xml /F

Then edit the `<UserId>` lines in the XML files if the account changed. Start a task manually
with `schtasks /run /TN "<task>"`, or remove everything with `schtasks /delete /TN "<task>" /F`
for each of the three. If a run of one of the `.vbs` files ever shows a Windows Script Host
error dialog, the dialog blocks that task silently — check `logs/` and the task state.

## Notes

- The tasks run as your interactive user on purpose: the engines' credentials (the Antigravity CLI logins, the
  OpenCode gateway key file) live in your user profile and project folder, which a SYSTEM service would not see.
- The app on the VPS (`polytronx-radiology-app`) has Docker `restart: unless-stopped` and needs
  nothing from this folder.
- `start-app.cmd` still works for a quick manual start, but with the tasks in place you should
  not need it — the tasks already started everything, and a second copy of any worker exits
  itself.
