FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json* ./
COPY packages/database/package.json ./packages/database/
COPY packages/crypto/package.json ./packages/crypto/
COPY packages/shared/package.json ./packages/shared/
RUN npm ci 2>/dev/null || npm install

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build --workspace=@secure-email/database --workspace=@secure-email/crypto --workspace=@secure-email/shared 2>/dev/null || true
RUN npm run build --workspace=api-server 2>/dev/null || npm run build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/apps/api-server/dist ./dist
COPY --from=builder /app/apps/api-server/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
EXPOSE 3001
CMD ["node", "dist/index.js"]
