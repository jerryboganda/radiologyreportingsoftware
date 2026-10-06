# syntax=docker/dockerfile:1
# Production image. Built by GitHub Actions (.github/workflows/image.yml), never on the shared VPS.

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runtime
LABEL org.opencontainers.image.source="https://github.com/jerryboganda/radiologyreportingsoftware"
# Chromium renders the A4 PDF; Roboto stands in for the print template's system UI stack.
# dbus + gnome-keyring back the Secret Service the Antigravity CLI (agy) stores its Google sign-in in.
RUN apt-get update \
 && apt-get install -y --no-install-recommends chromium fonts-roboto fonts-dejavu ca-certificates dbus gnome-keyring \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4321 CHROME_PATH=/usr/bin/chromium TZ=Asia/Karachi
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
# data/ (SQLite) and uploads/ (patient note photos) are volumes; the app runs unprivileged.
RUN mkdir -p data uploads && chown -R node:node data uploads
# The AI worker runs in its own container from this same image: the queue worker script, the rulebook
# it feeds the engine, the output schema, and the scratch dirs it writes prompts and photos into.
COPY --from=build /app/AGENTS.md ./AGENTS.md
COPY --from=build /app/scripts/queue_worker.mjs ./scripts/queue_worker.mjs
COPY --from=build /app/scripts/report.schema.json ./scripts/report.schema.json
RUN mkdir -p .worker .worker-prod && chown -R node:node .worker .worker-prod
# Antigravity CLI (agy), linux-x64, resolved from Google's updater manifest and sha512-verified.
RUN set -e; node -e "(async()=>{const m=await(await fetch('https://antigravity-cli-auto-updater-974169037036.us-central1.run.app/manifests/linux_amd64.json')).json();const b=Buffer.from(await(await fetch(m.url)).arrayBuffer());const {createHash}=require('crypto');if(createHash('sha512').update(b).digest('hex')!==m.sha512)throw new Error('agy download failed sha512 verification');require('fs').writeFileSync('/tmp/agy.tar.gz',b);console.log('agy',m.version)})().catch(e=>{console.error(e);process.exit(1)})" \
 && mkdir /tmp/agyx && tar -xzf /tmp/agy.tar.gz -C /tmp/agyx \
 && install -m 0755 "$(find /tmp/agyx -type f -name agy | head -1)" /usr/local/bin/agy \
 && rm -rf /tmp/agy.tar.gz /tmp/agyx
COPY docker/worker-entrypoint.sh /usr/local/bin/worker-entrypoint.sh
RUN chmod 0755 /usr/local/bin/worker-entrypoint.sh
USER node
EXPOSE 4321
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4321)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/server/entry.mjs"]
