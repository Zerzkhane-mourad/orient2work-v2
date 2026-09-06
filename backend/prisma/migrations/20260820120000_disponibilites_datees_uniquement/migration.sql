-- Les disponibilités ne sont plus décrites que par des DATES.
--
-- La semaine type disparaît : une journée est réservable parce qu'elle a été
-- programmée, jamais parce qu'un jour de la semaine l'est en général. Les
-- règles hebdomadaires configurées jusqu'ici n'ont donc plus d'interprétation
-- possible et sont supprimées avec la table.
DROP TABLE IF EXISTS "disponibilites_regles";

-- Sans semaine type, « fermer » une date n'a plus de sens : il suffit de ne pas
-- la programmer. Les marqueurs de fermeture sont donc de simples lignes mortes.
DELETE FROM "disponibilites_dates"
WHERE "ferme" = true OR "debut" IS NULL OR "fin" IS NULL;

ALTER TABLE "disponibilites_dates" DROP COLUMN "ferme";

-- Toute ligne restante porte une plage : les colonnes peuvent enfin être NOT
-- NULL, ce qui retire du code la branche « journée sans horaires ».
ALTER TABLE "disponibilites_dates" ALTER COLUMN "debut" SET NOT NULL;
ALTER TABLE "disponibilites_dates" ALTER COLUMN "fin" SET NOT NULL;
