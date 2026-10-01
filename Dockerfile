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
RUN apt-get update \
 && apt-get install -y --no-install-recommends chromium fonts-roboto fonts-dejavu ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4321 CHROME_PATH=/usr/bin/chromium TZ=Asia/Karachi
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
# data/ (SQLite) and uploads/ (patient note photos) are volumes; the app runs unprivileged.
RUN mkdir -p data uploads && chown -R node:node data uploads
USER node
EXPOSE 4321
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4321)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/server/entry.mjs"]
