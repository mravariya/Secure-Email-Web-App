FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci 2>/dev/null || npm install

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
COPY apps/web-client/package.json ./apps/web-client/
COPY apps/web-client/ ./
RUN npm run build 2>/dev/null || (cd apps/web-client && npm run build)

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/apps/web-client/.next/standalone ./
COPY --from=builder /app/apps/web-client/.next/static ./.next/static
COPY --from=builder /app/apps/web-client/public ./public
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
