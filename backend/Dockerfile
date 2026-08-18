# --- deps: install once, reused by both the build stage and (via --omit=dev) production ---
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- build: compile TypeScript (src/**, including main.ts and main.worker.ts) to dist/ ---
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- production: only prod deps + compiled output, no TypeScript/ts-node/nest-cli ---
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
# Needed to transcode browser-recorded voice notes (WebM/Opus) to the
# OGG/Opus WhatsApp Cloud API requires — see AudioTranscodeService.
RUN apk add --no-cache ffmpeg
RUN addgroup -S app && adduser -S app -G app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
USER app
EXPOSE 3000

# Same image for both `backend` (API) and `worker` roles — docker-compose
# overrides CMD to `node dist/main.worker` and sets WORKER_MODE=true for the
# worker role. See src/main.worker.ts for what that split actually changes.
CMD ["node", "dist/main"]
