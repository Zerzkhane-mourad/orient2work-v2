-- Numérotation des certificats de formation.
-- Séquence dédiée : un numéro n'est consommé que pour une formation validée,
-- et deux téléchargements simultanés ne peuvent pas obtenir le même.
CREATE SEQUENCE "certificat_numero_seq";

-- AlterTable
ALTER TABLE "formation_progress" ADD COLUMN "certificatNumero" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "formation_progress_certificatNumero_key" ON "formation_progress"("certificatNumero");
