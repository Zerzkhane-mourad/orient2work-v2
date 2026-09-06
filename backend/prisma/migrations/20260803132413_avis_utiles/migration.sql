-- CreateTable
CREATE TABLE "avis_utiles" (
    "avisId" UUID NOT NULL,
    "jeuneId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "avis_utiles_pkey" PRIMARY KEY ("avisId","jeuneId")
);

-- CreateIndex
CREATE INDEX "avis_utiles_jeuneId_idx" ON "avis_utiles"("jeuneId");

-- AddForeignKey
ALTER TABLE "avis_utiles" ADD CONSTRAINT "avis_utiles_avisId_fkey" FOREIGN KEY ("avisId") REFERENCES "avis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avis_utiles" ADD CONSTRAINT "avis_utiles_jeuneId_fkey" FOREIGN KEY ("jeuneId") REFERENCES "jeunes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
