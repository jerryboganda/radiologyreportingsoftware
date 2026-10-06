#!/bin/bash
# Worker container entrypoint. agy reads its Google sign-in from the Secret Service, so the queue
# worker runs inside a session dbus with the keyring unlocked (KEYRING_PASSWORD from the .env).
# A failed unlock is fatal: without it every agy job would fail, so restart and retry instead.
set -e
cd /app
exec dbus-run-session -- bash -c 'printf "%s" "$KEYRING_PASSWORD" | gnome-keyring-daemon --unlock --components=secrets >/dev/null 2>&1; exec node scripts/queue_worker.mjs'
