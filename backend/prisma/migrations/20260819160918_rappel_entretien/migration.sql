-- AlterTable
ALTER TABLE "entretiens" ADD COLUMN     "rappelEnvoyeAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "entretiens_status_rappelEnvoyeAt_date_idx" ON "entretiens"("status", "rappelEnvoyeAt", "date");
