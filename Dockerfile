# api image: compiled TypeScript + production dependencies + migrations
FROM node:24-alpine AS base
RUN npm install -g pnpm@10.33.0
WORKDIR /app

# full install so tsc is available
FROM base AS build
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY tsconfig.json ./
COPY src ./src
RUN pnpm build

# runtime dependencies only, keeps typescript and drizzle-kit out of the final image
FROM base AS prod-deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json ./
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY drizzle ./drizzle
USER node
EXPOSE 8080
CMD ["node", "dist/index.js"]
