-- Catégories de formation administrables (§7.4).
--
-- La liste était figée dans le code : l'équipe OMB ne pouvait pas la faire
-- évoluer sans redéploiement. Elle passe en base, avec une clé étrangère depuis
-- `formations`.
--
-- Migration écrite à la main plutôt que générée : la version automatique aurait
-- supprimé la colonne `categorie` avant d'avoir rattaché les formations, donc
-- perdu l'information. Ici, chaque formation existante retrouve sa catégorie.

CREATE TABLE "formation_categories" (
    "id" UUID NOT NULL,
    "nom" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "formation_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "formation_categories_nom_key" ON "formation_categories"("nom");
CREATE INDEX "formation_categories_active_ordre_idx" ON "formation_categories"("active", "ordre");

-- 1. Les neuf catégories historiques, dans leur ordre d'affichage d'origine.
INSERT INTO "formation_categories" ("id", "nom", "ordre", "updatedAt") VALUES
    (gen_random_uuid(), 'CV', 0, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Lettre de motivation', 1, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Entretien', 2, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'LinkedIn', 3, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Recherche d''emploi', 4, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Soft skills', 5, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Préparation forum', 6, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Orientation professionnelle', 7, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Spécialité', 8, CURRENT_TIMESTAMP);

-- 2. Filet de sécurité : toute catégorie déjà utilisée en base mais absente de
--    la liste ci-dessus est créée, pour qu'aucune formation ne reste orpheline.
INSERT INTO "formation_categories" ("id", "nom", "ordre", "updatedAt")
SELECT gen_random_uuid(), d."categorie", 100, CURRENT_TIMESTAMP
FROM (SELECT DISTINCT "categorie" FROM "formations") AS d
WHERE NOT EXISTS (
    SELECT 1 FROM "formation_categories" c WHERE c."nom" = d."categorie"
);

-- 3. Rattachement des formations, puis bascule de la colonne.
ALTER TABLE "formations" ADD COLUMN "categorieId" UUID;

UPDATE "formations" f
SET "categorieId" = c."id"
FROM "formation_categories" c
WHERE c."nom" = f."categorie";

ALTER TABLE "formations" ALTER COLUMN "categorieId" SET NOT NULL;

DROP INDEX IF EXISTS "formations_categorie_idx";
ALTER TABLE "formations" DROP COLUMN "categorie";

CREATE INDEX "formations_categorieId_idx" ON "formations"("categorieId");

-- `RESTRICT` : supprimer une catégorie encore utilisée est refusé par la base,
-- en plus du contrôle applicatif.
ALTER TABLE "formations" ADD CONSTRAINT "formations_categorieId_fkey"
    FOREIGN KEY ("categorieId") REFERENCES "formation_categories"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
