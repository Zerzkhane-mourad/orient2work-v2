#!/bin/sh
# Démarrage du conteneur : migrations, seed optionnel, puis l'API.
set -e

npx prisma migrate deploy

# Données de démonstration — uniquement pour une version de TEST
# (les mots de passe du seed sont publics). Le seed est idempotent.
if [ "$SEED_ON_START" = "true" ]; then
  npx tsx prisma/seed.ts
fi

exec node dist/server.js
