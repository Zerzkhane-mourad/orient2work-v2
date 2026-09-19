# ──────────────────────────────────────────────────────────────────────────────
# Orient2Work API — image de production (Railway, VPS, tout hôte Docker).
# ──────────────────────────────────────────────────────────────────────────────
FROM node:22-slim AS base
# Prisma a besoin d'OpenSSL pour ses moteurs.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ── Build ─────────────────────────────────────────────────────────────────────
FROM base AS build
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build

# ── Runtime ───────────────────────────────────────────────────────────────────
# Les devDependencies sont conservées volontairement : `tsx` sert au seed
# (données de démonstration de la version de test).
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/src/domain ./src/domain
COPY --from=build /app/assets ./assets
COPY package.json tsconfig.json docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh && mkdir -p storage/uploads

EXPOSE 4000
CMD ["./docker-entrypoint.sh"]
