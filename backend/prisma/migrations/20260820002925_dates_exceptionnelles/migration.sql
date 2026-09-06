-- CreateTable
CREATE TABLE "disponibilites_dates" (
    "id" UUID NOT NULL,
    "entrepriseId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "ferme" BOOLEAN NOT NULL DEFAULT false,
    "debut" TEXT,
    "fin" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disponibilites_dates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "disponibilites_dates_entrepriseId_date_idx" ON "disponibilites_dates"("entrepriseId", "date");

-- AddForeignKey
ALTER TABLE "disponibilites_dates" ADD CONSTRAINT "disponibilites_dates_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "entreprises"("id") ON DELETE CASCADE ON UPDATE CASCADE;
