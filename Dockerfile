# =============================================================================
# Production image for the TamFam Next.js app (standalone output).
# Built by Coolify (or any Docker host). Multi-stage for a small final image.
#
# NOTE: NEXT_PUBLIC_* values are inlined at BUILD time, so they must be passed as
# build args (in Coolify: mark those env vars as "Build Variable"). The
# service-role key and other secrets are read at RUNTIME only.
# =============================================================================
FROM node:20-alpine AS base

# ---- Dependencies -----------------------------------------------------------
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- Build ------------------------------------------------------------------
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Public (client-visible) config, needed at build time.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_DATA_CONTROLLER_NAME
ARG NEXT_PUBLIC_DATA_CONTROLLER_EMAIL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_DATA_CONTROLLER_NAME=$NEXT_PUBLIC_DATA_CONTROLLER_NAME \
    NEXT_PUBLIC_DATA_CONTROLLER_EMAIL=$NEXT_PUBLIC_DATA_CONTROLLER_EMAIL \
    NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ---- Runner -----------------------------------------------------------------
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Run as a non-root user.
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
