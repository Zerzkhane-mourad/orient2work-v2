-- Les questions du test de validation appartiennent désormais à un TEST.
--
-- Avant : un vivier plat de questions, chacune ciblant une filière ou commune ;
-- le candidat recevait les 20 premières actives de son domaine.
-- Après : un test par filière, plus un test commun. Un candidat reçoit LE test
-- de sa filière, ou le test commun à défaut.
--
-- Migration de reprise : aucune question n'est perdue ni détachée de sa filière
-- — chaque groupe de questions devient le test de sa filière.

CREATE TABLE "tests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "titre" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "filiereId" UUID,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tests_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "tests"
    ADD CONSTRAINT "tests_filiereId_fkey"
    FOREIGN KEY ("filiereId") REFERENCES "filieres"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Un seul test par filière.
CREATE UNIQUE INDEX "tests_filiereId_key" ON "tests"("filiereId");

-- Et un seul test commun : l'index ci-dessus ne l'assure pas, Postgres
-- considérant deux NULL comme distincts. D'où cet index partiel.
CREATE UNIQUE INDEX "tests_unique_commun" ON "tests"((1)) WHERE "filiereId" IS NULL;

-- Un test par filière ayant au moins une question.
INSERT INTO "tests" ("id", "titre", "description", "filiereId", "active", "updatedAt")
SELECT
    gen_random_uuid(),
    'Test de validation — ' || f."nom",
    'Test de validation du compte pour la filière ' || f."nom" || '.',
    f."id",
    true,
    CURRENT_TIMESTAMP
FROM "filieres" f
WHERE EXISTS (SELECT 1 FROM "quiz_questions" q WHERE q."filiereId" = f."id");

-- Le test commun, si des questions n'étaient rattachées à aucune filière.
INSERT INTO "tests" ("id", "titre", "description", "filiereId", "active", "updatedAt")
SELECT
    gen_random_uuid(),
    'Test de validation — commun',
    'Servi aux candidats dont la filière n''a pas de test propre.',
    NULL,
    true,
    CURRENT_TIMESTAMP
WHERE EXISTS (SELECT 1 FROM "quiz_questions" q WHERE q."filiereId" IS NULL);

-- Rattachement des questions, colonne d'abord nullable le temps du report.
ALTER TABLE "quiz_questions" ADD COLUMN "testId" UUID;
ALTER TABLE "quiz_questions" ADD COLUMN "ordre" INTEGER NOT NULL DEFAULT 0;

UPDATE "quiz_questions" q
SET "testId" = t."id"
FROM "tests" t
WHERE t."filiereId" IS NOT DISTINCT FROM q."filiereId";

-- Ordre d'affichage : celui dans lequel les questions étaient servies.
UPDATE "quiz_questions" q
SET "ordre" = rang."position"
FROM (
    SELECT "id", ROW_NUMBER() OVER (PARTITION BY "testId" ORDER BY "createdAt") - 1 AS "position"
    FROM "quiz_questions"
) rang
WHERE rang."id" = q."id";

-- Aucune question ne doit rester orpheline : la ligne suivante échoue si le
-- report en a manqué une, et la transaction est annulée plutôt que de laisser
-- une base à moitié migrée.
ALTER TABLE "quiz_questions" ALTER COLUMN "testId" SET NOT NULL;

ALTER TABLE "quiz_questions"
    ADD CONSTRAINT "quiz_questions_testId_fkey"
    FOREIGN KEY ("testId") REFERENCES "tests"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- La filière vit maintenant sur le test.
DROP INDEX IF EXISTS "quiz_questions_filiereId_active_idx";
ALTER TABLE "quiz_questions" DROP CONSTRAINT IF EXISTS "quiz_questions_filiereId_fkey";
ALTER TABLE "quiz_questions" DROP COLUMN "filiereId";

CREATE INDEX "quiz_questions_testId_active_idx" ON "quiz_questions"("testId", "active");
