-- DropIndex
DROP INDEX "disponibilites_regles_entrepriseId_jour_key";

-- CreateIndex
CREATE INDEX "disponibilites_regles_entrepriseId_jour_idx" ON "disponibilites_regles"("entrepriseId", "jour");
