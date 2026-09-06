-- Filières administrables (§7.4).
--
-- La filière était une colonne texte dupliquée dans quatre tables. Renommer une
-- filière depuis le back-office aurait laissé jeunes, offres, formations et
-- questions de quiz pointer sur l'ancien libellé, sans erreur visible : les
-- filtres se seraient simplement vidés. D'où la clé étrangère.
--
-- Migration écrite à la main : la version générée aurait supprimé les colonnes
-- avant de rattacher les enregistrements.

CREATE TABLE "filieres" (
    "id" UUID NOT NULL,
    "nom" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "filieres_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "filieres_nom_key" ON "filieres"("nom");
CREATE INDEX "filieres_active_ordre_idx" ON "filieres"("active", "ordre");

-- 1. Les onze filières historiques, dans leur ordre d'affichage d'origine.
INSERT INTO "filieres" ("id", "nom", "ordre", "updatedAt") VALUES
    (gen_random_uuid(), 'Informatique', 0, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Réseaux et télécommunications', 1, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Développement web', 2, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Data', 3, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Intelligence artificielle', 4, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Commerce', 5, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Marketing', 6, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Finance', 7, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Gestion', 8, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Génie industriel', 9, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Communication', 10, CURRENT_TIMESTAMP);

-- 2. Filet de sécurité : toute valeur déjà présente dans l'une des quatre tables
--    mais absente de la liste ci-dessus. Sans cela, l'étape `SET NOT NULL` sur
--    les offres échouerait sur un libellé inattendu.
INSERT INTO "filieres" ("id", "nom", "ordre", "updatedAt")
SELECT gen_random_uuid(), d."nom", 100, CURRENT_TIMESTAMP
FROM (
    SELECT DISTINCT "filiere" AS "nom" FROM "jeunes"         WHERE "filiere" <> ''
    UNION SELECT DISTINCT "filiere"    FROM "offres"         WHERE "filiere" <> ''
    UNION SELECT DISTINCT "filiere"    FROM "formations"     WHERE "filiere" IS NOT NULL AND "filiere" <> ''
    UNION SELECT DISTINCT "filiere"    FROM "quiz_questions" WHERE "filiere" IS NOT NULL AND "filiere" <> ''
) AS d
WHERE NOT EXISTS (SELECT 1 FROM "filieres" f WHERE f."nom" = d."nom");

-- 3. Rattachement, table par table.

-- Jeunes : la chaîne vide devient NULL (inscription sans filière renseignée).
ALTER TABLE "jeunes" ADD COLUMN "filiereId" UUID;
UPDATE "jeunes" j SET "filiereId" = f."id" FROM "filieres" f WHERE f."nom" = j."filiere";
DROP INDEX IF EXISTS "jeunes_filiere_idx";
ALTER TABLE "jeunes" DROP COLUMN "filiere";
CREATE INDEX "jeunes_filiereId_idx" ON "jeunes"("filiereId");
ALTER TABLE "jeunes" ADD CONSTRAINT "jeunes_filiereId_fkey"
    FOREIGN KEY ("filiereId") REFERENCES "filieres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Offres : la filière est obligatoire.
ALTER TABLE "offres" ADD COLUMN "filiereId" UUID;
UPDATE "offres" o SET "filiereId" = f."id" FROM "filieres" f WHERE f."nom" = o."filiere";
ALTER TABLE "offres" ALTER COLUMN "filiereId" SET NOT NULL;
DROP INDEX IF EXISTS "offres_filiere_idx";
ALTER TABLE "offres" DROP COLUMN "filiere";
CREATE INDEX "offres_filiereId_idx" ON "offres"("filiereId");
ALTER TABLE "offres" ADD CONSTRAINT "offres_filiereId_fkey"
    FOREIGN KEY ("filiereId") REFERENCES "filieres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Formations : NULL = formation commune à toutes les filières.
ALTER TABLE "formations" ADD COLUMN "filiereId" UUID;
UPDATE "formations" fo SET "filiereId" = f."id" FROM "filieres" f WHERE f."nom" = fo."filiere";
DROP INDEX IF EXISTS "formations_filiere_idx";
ALTER TABLE "formations" DROP COLUMN "filiere";
CREATE INDEX "formations_filiereId_idx" ON "formations"("filiereId");
ALTER TABLE "formations" ADD CONSTRAINT "formations_filiereId_fkey"
    FOREIGN KEY ("filiereId") REFERENCES "filieres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Questions de quiz : NULL = question commune.
ALTER TABLE "quiz_questions" ADD COLUMN "filiereId" UUID;
UPDATE "quiz_questions" q SET "filiereId" = f."id" FROM "filieres" f WHERE f."nom" = q."filiere";
DROP INDEX IF EXISTS "quiz_questions_filiere_active_idx";
ALTER TABLE "quiz_questions" DROP COLUMN "filiere";
CREATE INDEX "quiz_questions_filiereId_active_idx" ON "quiz_questions"("filiereId", "active");
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_filiereId_fkey"
    FOREIGN KEY ("filiereId") REFERENCES "filieres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
