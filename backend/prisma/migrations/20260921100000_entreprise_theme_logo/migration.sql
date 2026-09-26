-- Couleurs relevées dans le logo, servant au thème « auto ».
-- Nullables : les comptes existants n'ont pas de logo obligatoire et gardent
-- leur préréglage de thème.
-- AlterTable
ALTER TABLE "entreprises" ADD COLUMN     "themeCouleur" TEXT,
ADD COLUMN     "themeAccent" TEXT;
