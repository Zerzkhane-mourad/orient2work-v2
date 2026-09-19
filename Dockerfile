# ──────────────────────────────────────────────────────────────────────────────
# Orient2Work — frontend Next.js (Railway, VPS, tout hôte Docker).
# ──────────────────────────────────────────────────────────────────────────────
FROM node:22-slim AS base
WORKDIR /app

# ── Build ─────────────────────────────────────────────────────────────────────
FROM base AS build
# Lues au BUILD : NEXT_PUBLIC_* est inliné dans le bundle, et les rewrites sont
# figées dans le manifeste de routes.
ARG NEXT_PUBLIC_API_URL
ARG API_INTERNAL_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    API_INTERNAL_URL=$API_INTERNAL_URL \
    NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Runtime ───────────────────────────────────────────────────────────────────
FROM base AS runtime
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
