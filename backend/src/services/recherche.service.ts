/**
 * Recherche globale de l'Espace Jeune.
 *
 * Un seul appel plutôt que trois depuis le navigateur : une liste de
 * suggestions qui se rafraîchit à la frappe déclencherait sinon trois requêtes
 * par lettre, dont les réponses arriveraient dans le désordre — et il faudrait
 * réconcilier trois chargements pour savoir si le résultat est vide.
 *
 * Surtout, la VISIBILITÉ se décide ici : offres publiées et encore ouvertes,
 * formations publiées, entreprises validées et ouvertes aux candidatures
 * spontanées. Laisser le client composer ces filtres reviendrait à lui confier
 * ce qu'il a le droit de voir.
 *
 * Chaque groupe ne renvoie que ce qui MÈNE QUELQUE PART : sans page de détail
 * entreprise côté jeune, une entreprise n'est proposée que si l'on peut y
 * réserver un créneau.
 *
 * L'appariement du TEXTE est délégué à `recherche.repository`, qui ignore les
 * accents ; la VISIBILITÉ reste exprimée ici avec les `where` Prisma déjà
 * utilisés par les listes publiques. Les deux se combinent par identifiant.
 */
import * as offreRepository from "../repositories/offre.repository.js";
import * as formationRepository from "../repositories/formation.repository.js";
import * as disponibiliteRepository from "../repositories/disponibilite.repository.js";
import * as rechercheRepository from "../repositories/recherche.repository.js";
import type { RechercheInput } from "../validators/recherche.validator.js";

/** Nature d'un résultat — décide de l'icône et du lien, côté client. */
export type TypeResultat = "offre" | "formation" | "entreprise";

/**
 * Forme COMMUNE à tous les résultats.
 *
 * Une seule forme, donc un seul rendu côté client, et des groupes qu'on peut
 * réordonner sans toucher à l'affichage. Renvoyer les entités complètes
 * obligerait le navigateur à savoir lire trois formes différentes pour
 * n'afficher, à chaque fois, qu'un titre et une ligne de contexte.
 */
export interface Resultat {
  id: string;
  titre: string;
  /** Ligne de contexte : entreprise et ville, catégorie, secteur… */
  sousTitre: string;
  /** Vignette éventuelle (logo d'entreprise, illustration de formation). */
  image?: string;
}

export interface GroupeResultats {
  type: TypeResultat;
  /** Total réel, au-delà des quelques éléments renvoyés. */
  total: number;
  items: Resultat[];
}

export interface RechercheDto {
  q: string;
  /** Somme des totaux : `0` dit « rien trouvé » sans avoir à parcourir. */
  total: number;
  groupes: GroupeResultats[];
}

export async function rechercher(input: RechercheInput): Promise<RechercheDto> {
  const q = input.q.trim();
  const limite = input.limit;

  // Une recherche vide renverrait les premiers éléments de chaque liste, ce qui
  // se lirait comme des suggestions choisies alors que c'est un ordre arbitraire.
  if (!q) return { q: "", total: 0, groupes: [] };

  /*
   * En parallèle : les trois requêtes sont indépendantes. Les enchaîner
   * ferait payer au champ de recherche la somme de leurs latences, à chaque
   * frappe.
   */
  const [offres, formations, entreprises] = await Promise.all([
    chercherOffres(q, limite),
    chercherFormations(q, limite),
    chercherEntreprises(q, limite),
  ]);

  // Ordre figé : les offres d'abord, c'est ce que l'on vient chercher. Les
  // groupes vides sont retirés — un intitulé « Formations (0) » n'apprend rien.
  const groupes = [offres, formations, entreprises].filter((groupe) => groupe.total > 0);

  return {
    q,
    total: groupes.reduce((somme, groupe) => somme + groupe.total, 0),
    groupes,
  };
}

async function chercherOffres(q: string, limite: number): Promise<GroupeResultats> {
  const ids = await rechercheRepository.idsOffresCorrespondantes(q);
  if (ids.length === 0) return { type: "offre", total: 0, items: [] };

  const where = {
    // Mêmes règles que la liste publique : ni brouillon, ni offre expirée.
    ...offreRepository.buildOffreWhere({ status: "publiee", ouvertesSeulement: true }),
    id: { in: ids },
  };

  const [lignes, total] = await offreRepository.listOffres(where, 0, limite);

  return {
    type: "offre",
    total,
    items: lignes.map((offre) => ({
      id: offre.id,
      titre: offre.titre,
      sousTitre: `${offre.entreprise.nom} · ${offre.ville} · ${offre.type}`,
      ...(offre.entreprise.logo ? { image: offre.entreprise.logo } : {}),
    })),
  };
}

async function chercherFormations(q: string, limite: number): Promise<GroupeResultats> {
  const ids = await rechercheRepository.idsFormationsCorrespondantes(q);
  if (ids.length === 0) return { type: "formation", total: 0, items: [] };

  const where = {
    ...formationRepository.buildFormationWhere({ publiee: true }),
    id: { in: ids },
  };
  const [lignes, total] = await formationRepository.listFormations(where, 0, limite);

  return {
    type: "formation",
    total,
    items: lignes.map((formation) => ({
      id: formation.id,
      titre: formation.titre,
      sousTitre: [
        formation.categorie?.nom,
        `${formation.tempsLectureMin} min`,
        formation.certifiante ? "Certifiante" : null,
      ]
        .filter(Boolean)
        .join(" · "),
      ...(formation.image ? { image: formation.image } : {}),
    })),
  };
}

/**
 * Entreprises ouvertes aux candidatures spontanées.
 *
 * Les autres sont volontairement absentes : sans fiche entreprise dans l'Espace
 * Jeune, un résultat qui ne mène nulle part est pire qu'un résultat manquant.
 */
async function chercherEntreprises(q: string, limite: number): Promise<GroupeResultats> {
  const ids = await rechercheRepository.idsEntreprisesCorrespondantes(q);
  if (ids.length === 0) return { type: "entreprise", total: 0, items: [] };

  const [lignes, total] = await disponibiliteRepository.listerEntreprisesOuvertesParId(ids, limite);

  return {
    type: "entreprise",
    total,
    items: lignes.map((entreprise) => ({
      id: entreprise.id,
      titre: entreprise.nom,
      sousTitre: `${entreprise.secteur} · ${entreprise.ville}`,
      ...(entreprise.logo ? { image: entreprise.logo } : {}),
    })),
  };
}
