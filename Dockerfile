FROM node:22-bookworm-slim
# Roboto stands in for the print template's system UI stack (Segoe UI / Roboto) when Chromium renders PDFs.
RUN apt-get update && apt-get install -y --no-install-recommends chromium fonts-roboto fonts-dejavu && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
ENV HOST=0.0.0.0 PORT=4321 CHROME_PATH=/usr/bin/chromium
EXPOSE 4321
CMD ["node", "dist/server/entry.mjs"]
