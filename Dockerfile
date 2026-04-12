FROM node:22-alpine AS base

# ── deps stage ────────────────────────────────────────────────────────────────
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ── builder stage ─────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build without linting (credentials not available at build time)
RUN npm run build

# ── runner stage ──────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# Cloud Run sets PORT=8080; Next.js standalone server respects this
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone server output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Tesseract.js standalone build trims node_modules — copy the full package
# so its internal requires (e.g. require('..')) resolve correctly at runtime
COPY --from=builder /app/node_modules/tesseract.js ./node_modules/tesseract.js
COPY --from=builder /app/node_modules/tesseract.js/src ./node_modules/tesseract.js/src

USER nextjs

EXPOSE 8080

CMD ["node", "server.js"]
