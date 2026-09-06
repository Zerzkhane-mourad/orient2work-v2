-- Visuel de couverture des formations.
--
-- Nouveau type de document, à la différence des autres : il est servi
-- PUBLIQUEMENT (route `GET /formations/:id/image`), puisqu'une couverture de
-- cours s'affiche dans le catalogue ouvert aux visiteurs anonymes. Les autres
-- types restent derrière une vérification de droits à chaque accès.
--
-- `BEFORE 'AUTRE'` conserve un ordre lisible dans l'enum.
ALTER TYPE "DocumentType" ADD VALUE 'FORMATION' BEFORE 'AUTRE';
