@echo off
rem Starts PolytronX on http://localhost:4321 (real data in .\data) together with its AI worker
rem (Antigravity or OpenCode CLI; engine and model are chosen in the app Settings). No Docker needed. Rebuild after code changes: npm run build
cd /d "%~dp0"
set HOST=127.0.0.1
set PORT=4321
set TZ=Asia/Karachi
start "PolytronX server" /min node dist\server\entry.mjs
start "PolytronX AI worker" /min node scripts\queue_worker.mjs
timeout /t 3 /nobreak >nul
start "" http://localhost:4321
