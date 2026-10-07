# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 PUPPETEER_SKIP_DOWNLOAD=true
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

FROM base AS dependencies
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

FROM dependencies AS migration-tools
# Retain the CLI used by the protected dev-refresh command in its own module
# tree so its dependencies cannot overwrite Next's traced runtime modules.
RUN --mount=type=cache,target=/root/.npm npm install --prefix /opt/migrations --no-audit --no-fund --omit=dev prisma@6.16.2

FROM dependencies AS builder
COPY . .
# Public browser configuration must be available when Next compiles the bundle.
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_DOMAIN
ARG NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
ARG NEXT_PUBLIC_LIVEKIT_URL
ARG NEXT_PUBLIC_RECAPTCHA_SITE_KEY
ARG NEXT_PUBLIC_SOCKETIO_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL NEXT_PUBLIC_DOMAIN=$NEXT_PUBLIC_DOMAIN NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=$NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME NEXT_PUBLIC_LIVEKIT_URL=$NEXT_PUBLIC_LIVEKIT_URL NEXT_PUBLIC_RECAPTCHA_SITE_KEY=$NEXT_PUBLIC_RECAPTCHA_SITE_KEY NEXT_PUBLIC_SOCKETIO_URL=$NEXT_PUBLIC_SOCKETIO_URL
ARG SOURCE_COMMIT
# Build placeholders never authorize calls to external services. Real secrets
# are supplied to the running container, not copied into the build context.
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build RESEND_API_KEY=re_build PAYPAL_CLIENT_ID=build PAYPAL_CLIENT_SECRET=build GEMINI_API_KEY=build node --max-old-space-size=6144 node_modules/next/dist/bin/next build

FROM base AS runner
RUN apt-get update && apt-get install -y --no-install-recommends curl libnspr4 libnss3 libasound2 libexpat1 && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000
ARG SOURCE_COMMIT
ENV SOURCE_COMMIT=$SOURCE_COMMIT
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --from=migration-tools --chown=node:node /opt/migrations /opt/migrations
RUN rm -rf node_modules/prisma && ln -s /opt/migrations/node_modules/prisma node_modules/prisma
USER node
EXPOSE 3000
CMD ["node", "server.js"]
