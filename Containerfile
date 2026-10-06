FROM node:24-bookworm-slim AS dependencies

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-bookworm-slim AS builder

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build -- --webpack
RUN mkdir -p /app/public

FROM node:24-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    EVIDENCE_STORAGE_DIR=/data/evidence \
    PROFILE_IMAGE_STORAGE_DIR=/data/profile-images

RUN mkdir -p /data/evidence /data/profile-images \
    && chown node:node /data/evidence /data/profile-images \
    && chmod 700 /data/evidence /data/profile-images

COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=dependencies --chown=node:node /app/node_modules/server-only ./node_modules/server-only
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/src/app/data ./src/app/data
COPY --from=builder --chown=node:node /app/src/app/lib ./src/app/lib
COPY --from=builder --chown=node:node /app/scripts ./scripts
COPY --from=builder --chown=node:node /app/db/migrations ./db/migrations
COPY --from=builder --chown=node:node /app/package.json ./package.json

USER node
EXPOSE 3000
ENTRYPOINT ["/app/scripts/ops/container-entrypoint.sh"]
CMD ["node", "server.js"]
