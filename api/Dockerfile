# Stage 1: turbo prune — minimal context for @sakin/api
FROM node:20-alpine AS pruner
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune @sakin/api --docker

# Stage 2: install dependencies on pruned lockfile
FROM node:20-alpine AS installer
WORKDIR /app
RUN npm install -g pnpm
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile

# Stage 3: build packages + api
FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY --from=installer /app .
COPY --from=pruner /app/out/full/ .
RUN pnpm --filter=@sakin/shared build
RUN pnpm --filter=@sakin/database build
RUN pnpm --filter=@sakin/api build

# Stage 4: minimal production runtime
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nestjs
COPY --from=builder --chown=nestjs:nodejs /app/api/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
USER nestjs
EXPOSE 3001
CMD ["node", "dist/main"]
