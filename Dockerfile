# syntax=docker/dockerfile:1
# one image for every service; deploy/compose.yml picks the folder and command for each container

FROM node:24-bookworm-slim AS base
# corepack installs the pnpm version pinned in package.json's packageManager
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH COREPACK_ENABLE_DOWNLOAD_PROMPT=0 CI=true
RUN corepack enable
WORKDIR /app

# full source and dev dependencies: compiles every package, and runs the migrations (drizzle-kit is a dev dependency)
FROM base AS build
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm build

# production dependencies and compiled output only, so no source, tests or dev tools ship
FROM base AS runtime
ENV NODE_ENV=production
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/
COPY services/gateway/package.json services/gateway/
COPY services/auth-service/package.json services/auth-service/
COPY services/media-service/package.json services/media-service/
COPY services/notification-service/package.json services/notification-service/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/services/gateway/dist services/gateway/dist
COPY --from=build /app/services/auth-service/dist services/auth-service/dist
COPY --from=build /app/services/media-service/dist services/media-service/dist
COPY --from=build /app/services/notification-service/dist services/notification-service/dist
USER node
