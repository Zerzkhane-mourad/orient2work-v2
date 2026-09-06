-- Couverture téléversée d'une formation.
--
-- `image` porte déjà l'URL exposée aux clients ; cette colonne retient le
-- FICHIER derrière, ce que l'URL ne permet pas de retrouver. Sans elle,
-- remplacer une couverture laisserait l'ancien fichier orphelin sur le disque.
--
-- `ON DELETE SET NULL` : effacer le document ne doit pas effacer la formation.
ALTER TABLE "formations" ADD COLUMN "imageDocumentId" UUID;

CREATE UNIQUE INDEX "formations_imageDocumentId_key" ON "formations"("imageDocumentId");

ALTER TABLE "formations" ADD CONSTRAINT "formations_imageDocumentId_fkey"
    FOREIGN KEY ("imageDocumentId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
