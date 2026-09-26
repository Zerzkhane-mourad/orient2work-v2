-- CreateTable
CREATE TABLE "roles_admin" (
    "id" UUID NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "permissions" TEXT[],
    "systeme" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_admin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_admin_nom_key" ON "roles_admin"("nom");

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "nom" TEXT,
ADD COLUMN     "roleAdminId" UUID;

-- CreateIndex
CREATE INDEX "users_roleAdminId_idx" ON "users"("roleAdminId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_roleAdminId_fkey" FOREIGN KEY ("roleAdminId") REFERENCES "roles_admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Amorçage du rôle fondateur.
--
-- Sans rôle, un compte ADMIN n'a AUCUNE permission : c'est le défaut sûr, mais
-- il fermerait le back-office aux comptes existants au moment du déploiement.
-- Ils sont donc rattachés au rôle système, dont les permissions sont calculées
-- (tout le catalogue) et non stockées — d'où le tableau vide.
--
-- Identifiant fixe plutôt que `gen_random_uuid()` : la ligne doit rester
-- désignable par les scripts de reprise, et l'extension pgcrypto n'est pas
-- garantie sur toutes les instances.
INSERT INTO "roles_admin" ("id", "nom", "description", "permissions", "systeme", "createdAt", "updatedAt")
VALUES (
    '00000000-0000-4000-a000-000000000001',
    'Super administrateur',
    'Accès complet au back-office. Rôle système : ses permissions suivent automatiquement le catalogue.',
    ARRAY[]::TEXT[],
    true,
    NOW(),
    NOW()
);

UPDATE "users"
SET "roleAdminId" = '00000000-0000-4000-a000-000000000001'
WHERE "role" = 'ADMIN' AND "roleAdminId" IS NULL;
