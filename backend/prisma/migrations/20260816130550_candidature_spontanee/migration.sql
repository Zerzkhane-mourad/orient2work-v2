-- AlterTable
ALTER TABLE "entreprises" ADD COLUMN     "creneauDureeMin" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "reservationSemaines" INTEGER NOT NULL DEFAULT 4,
ADD COLUMN     "spontaneeMessage" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "spontaneeOuverte" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "entretiens" ADD COLUMN     "spontanee" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "tests" ALTER COLUMN "id" DROP DEFAULT;

-- CreateTable
CREATE TABLE "disponibilites_regles" (
    "id" UUID NOT NULL,
    "entrepriseId" UUID NOT NULL,
    "jour" INTEGER NOT NULL,
    "debut" TEXT NOT NULL,
    "fin" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disponibilites_regles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "disponibilites_regles_entrepriseId_jour_key" ON "disponibilites_regles"("entrepriseId", "jour");

-- CreateIndex
CREATE INDEX "entretiens_entrepriseId_date_idx" ON "entretiens"("entrepriseId", "date");

-- AddForeignKey
ALTER TABLE "disponibilites_regles" ADD CONSTRAINT "disponibilites_regles_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "entreprises"("id") ON DELETE CASCADE ON UPDATE CASCADE;
