/**
 * Où mène un résultat de recherche, et à quoi il ressemble.
 *
 * Tables exhaustives `Record<TypeResultat, …>` : ajouter un type de résultat au
 * contrat de l'API fait échouer la compilation tant qu'on n'a pas dit où il
 * conduit. Sans cela, un nouveau type s'afficherait avec une icône par défaut
 * et un lien mort.
 */
import type { IconName } from "@/components/ui/icon";
import type { TypeResultat } from "@/lib/api/types";

export const LIBELLE_GROUPE: Record<TypeResultat, string> = {
  offre: "Offres",
  formation: "Formations",
  entreprise: "Entreprises",
};

export const ICONE_GROUPE: Record<TypeResultat, IconName> = {
  offre: "work",
  formation: "school",
  entreprise: "business",
};

/** Destination d'un résultat. */
export function lienResultat(type: TypeResultat, id: string): string {
  const routes: Record<TypeResultat, string> = {
    offre: `/espace-jeune/offres/${id}`,
    formation: `/espace-jeune/formations/${id}`,
    /*
     * Il n'existe pas de fiche entreprise dans l'Espace Jeune : on renvoie vers
     * l'écran où l'on peut agir — réserver un créneau — en désignant
     * l'entreprise, plutôt que vers une page qui n'existe pas.
     */
    entreprise: `/espace-jeune/candidature-spontanee?entreprise=${id}`,
  };
  return routes[type];
}

/** Écran listant TOUS les résultats d'un groupe, pour « voir les N autres ». */
export function lienGroupe(type: TypeResultat, q: string): string {
  const terme = encodeURIComponent(q);
  const routes: Record<TypeResultat, string> = {
    offre: `/espace-jeune/offres?q=${terme}`,
    formation: `/espace-jeune/formations?q=${terme}`,
    entreprise: `/espace-jeune/candidature-spontanee?q=${terme}`,
  };
  return routes[type];
}
