-- Questions fréquentes, administrables depuis le back-office.
CREATE TABLE "faq" (
    "id" UUID NOT NULL,
    "question" TEXT NOT NULL,
    "reponse" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "publiee" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faq_pkey" PRIMARY KEY ("id")
);

-- La lecture publique filtre sur « publiee » puis trie sur « ordre » : les deux
-- colonnes dans cet ordre permettent de servir la page sans tri en mémoire.
CREATE INDEX "faq_publiee_ordre_idx" ON "faq"("publiee", "ordre");
