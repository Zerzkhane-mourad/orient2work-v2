-- Questions à choix multiples (inspirées d'Udemy).
--
-- `bonneReponse` ne portait qu'un index : impossible d'exprimer une question
-- dont plusieurs options sont justes. La colonne devient un tableau d'index,
-- ce qui couvre les trois types d'un seul modèle :
--   • qcm             → exactement 1 index
--   • vrai_faux       → exactement 1 index, sur 2 options
--   • choix_multiples → au moins 2 index
--
-- Conversion sans perte : chaque question existante garde sa réponse, seule sa
-- forme change (`3` devient `{3}`).

ALTER TYPE "QuestionType" ADD VALUE 'choix_multiples' AFTER 'qcm';

-- Quiz de validation d'une formation
ALTER TABLE "formation_quiz_questions" ADD COLUMN "bonnesReponses" INTEGER[] NOT NULL DEFAULT '{}';
UPDATE "formation_quiz_questions" SET "bonnesReponses" = ARRAY["bonneReponse"];
ALTER TABLE "formation_quiz_questions" ALTER COLUMN "bonnesReponses" DROP DEFAULT;
ALTER TABLE "formation_quiz_questions" DROP COLUMN "bonneReponse";

-- Test de validation général
ALTER TABLE "quiz_questions" ADD COLUMN "bonnesReponses" INTEGER[] NOT NULL DEFAULT '{}';
UPDATE "quiz_questions" SET "bonnesReponses" = ARRAY["bonneReponse"];
ALTER TABLE "quiz_questions" ALTER COLUMN "bonnesReponses" DROP DEFAULT;
ALTER TABLE "quiz_questions" DROP COLUMN "bonneReponse";
