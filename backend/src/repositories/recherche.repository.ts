/**
 * Appariement TEXTUEL de la recherche globale, accents ignorés.
 *
 * Pourquoi du SQL brut ici, et nulle part ailleurs : `unaccent()` est une
 * fonction Postgres, et le `where` typé de Prisma ne sait pas appeler de
 * fonction. Or `mode: "insensitive"` ne couvre que la casse — en français, cela
 * suffit à rendre la recherche inutilisable, « developpeur » ne rencontrant
 * jamais « Développeur ».
 *
 * Ces requêtes ne renvoient donc QUE des identifiants, et rien d'autre : ce qui
 * est VISIBLE — offre publiée et non expirée, formation publiée, entreprise
 * validée et ouverte — reste décidé par les `where` Prisma existants, en un
 * seul endroit. Dupliquer ces règles en SQL les ferait diverger au premier
 * changement.
 *
 * Coût assumé : la présélection n'est pas bornée, pour que le total annoncé
 * reste exact après filtrage. À l'échelle de ces tables c'est sans effet ; le
 * jour où elles grossiront, un index trigramme sur `o2w_unaccent(colonne)` est
 * possible — c'est précisément à quoi sert l'enveloppe IMMUTABLE créée par la
 * migration.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

/** `%terme%`, insensible à la casse et aux accents, pour un `ILIKE`. */
function motif(q: string): string {
  // Les jokers SQL saisis par l'utilisateur sont neutralisés : « 100% » ne doit
  // pas se comporter comme « tout ce qui commence par 100 ».
  const echappe = q.replace(/[\\%_]/g, (caractere) => `\\${caractere}`);
  return `%${echappe}%`;
}

const idsDe = (lignes: Array<{ id: string }>) => lignes.map((ligne) => ligne.id);

export async function idsOffresCorrespondantes(q: string): Promise<string[]> {
  const p = motif(q);
  const lignes = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT o.id
    FROM offres o
    JOIN entreprises e ON e.id = o."entrepriseId"
    WHERE o2w_unaccent(o.titre) ILIKE o2w_unaccent(${p})
       OR o2w_unaccent(o.description) ILIKE o2w_unaccent(${p})
       OR o2w_unaccent(e.nom) ILIKE o2w_unaccent(${p})
       -- « competences » est un tableau : aplati pour être fouillé comme du texte.
       OR o2w_unaccent(array_to_string(o.competences, ' ')) ILIKE o2w_unaccent(${p})
  `);
  return idsDe(lignes);
}

export async function idsFormationsCorrespondantes(q: string): Promise<string[]> {
  const p = motif(q);
  const lignes = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT id
    FROM formations
    WHERE o2w_unaccent(titre) ILIKE o2w_unaccent(${p})
       -- « sousTitre » est nullable : coalesce évite qu'un NULL n'annule la ligne.
       OR o2w_unaccent(coalesce("sousTitre", '')) ILIKE o2w_unaccent(${p})
       OR o2w_unaccent(description) ILIKE o2w_unaccent(${p})
  `);
  return idsDe(lignes);
}

export async function idsEntreprisesCorrespondantes(q: string): Promise<string[]> {
  const p = motif(q);
  const lignes = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT id
    FROM entreprises
    WHERE o2w_unaccent(nom) ILIKE o2w_unaccent(${p})
       OR o2w_unaccent(secteur) ILIKE o2w_unaccent(${p})
  `);
  return idsDe(lignes);
}
