# web image: the built SPA served by caddy on :80, behind the shared edge proxy
FROM node:24-alpine AS build
RUN npm install -g pnpm@10.33.0
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
# the official image runs as root; serve on an unprivileged port as an unprivileged user instead
USER 65534:65534
EXPOSE 8080
