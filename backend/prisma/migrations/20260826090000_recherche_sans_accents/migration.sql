-- Recherche insensible aux ACCENTS.
--
-- `mode: "insensitive"` de Prisma ne couvre que la CASSE. En français, cela
-- suffit à rendre la recherche inutilisable : « developpeur » ne rencontrait
-- jamais « Développeur », et l'utilisateur en concluait qu'il n'y a rien.
CREATE EXTENSION IF NOT EXISTS unaccent;

-- `unaccent()` est déclarée STABLE, pas IMMUTABLE : Postgres refuse donc de
-- l'utiliser dans un index d'expression, parce qu'elle dépend d'un dictionnaire
-- qu'on pourrait recharger. En figeant le dictionnaire dans cette enveloppe, la
-- fonction devient IMMUTABLE et l'expression redevient indexable — ce qui sera
-- nécessaire dès que les tables grossiront.
CREATE OR REPLACE FUNCTION o2w_unaccent(texte text)
  RETURNS text
  LANGUAGE sql
  IMMUTABLE
  STRICT
  PARALLEL SAFE
AS $$
  SELECT public.unaccent('public.unaccent'::regdictionary, texte)
$$;
