#!/usr/bin/env bash
# runs on the vps (uploaded to /opt/ckauth by the deploy workflow): deploy.sh <api|web> <git sha>
# deploys one service without touching the other, so frontend and backend ship independently
set -euo pipefail

SERVICE=${1:?usage: deploy.sh <api|web> <git sha>}
TAG=${2:?usage: deploy.sh <api|web> <git sha>}

case "$SERVICE" in
  api) TAG_VAR=API_TAG ;;
  web) TAG_VAR=WEB_TAG ;;
  *) echo "unknown service: $SERVICE" >&2; exit 1 ;;
esac
[[ "$TAG" =~ ^[0-9a-f]{40}$ ]] || { echo "tag must be a full git sha" >&2; exit 1; }

cd /opt/ckauth

# the shell variable overrides .env for this run; .env is only updated once the release is healthy,
# so a failed deploy leaves .env describing what is actually running
export "$TAG_VAR=$TAG"

docker compose pull "$SERVICE"

if [ "$SERVICE" = api ]; then
  docker compose up -d --wait db
  # a failed migration stops here, while the old api is still serving
  docker compose run --rm migrate
fi

# --no-deps: leave the other service alone; --wait: fail unless the new container turns healthy
docker compose up -d --no-deps --wait "$SERVICE"
sed -i "s/^$TAG_VAR=.*/$TAG_VAR=$TAG/" .env

# publish the site config to the shared proxy; validate first so a bad file can't take down other sites
# write-then-rename: atomic, and works whoever owns the old file (only folder access is needed)
cp ckauth.caddy /opt/edge/sites/ckauth.caddy.new
mv -f /opt/edge/sites/ckauth.caddy.new /opt/edge/sites/ckauth.caddy
docker compose -f /opt/edge/compose.yml exec -T caddy caddy validate --config /etc/caddy/Caddyfile
docker compose -f /opt/edge/compose.yml exec -T caddy caddy reload --config /etc/caddy/Caddyfile

docker image prune -f
echo "deployed $SERVICE @ $TAG"
