/**
 * Adaptateurs API → types d'affichage du frontend.
 *
 * Les DTO du backend et les interfaces de `src/lib/types.ts` ont la même forme ;
 * ils ne diffèrent que par la précision des types (`filiere: string` côté API,
 * union littérale côté UI). Ces fonctions font la conversion en un seul endroit,
 * ce qui évite de propager des `as` dans les composants.
 *
 * Les élargissements de type sont sûrs : le backend valide ces champs contre le
 * MÊME référentiel (`domain/enums.ts`, miroir de `lib/constants.ts`).
 */
import { asIconName } from "@/components/ui/icon";
import type { ApiAvis, ApiJeune, ApiJeunePublic, ApiNotification } from "./types";
import type { Avis, Experience, Jeune, LienType, Notification } from "@/lib/types";

/** Profil jeune complet (vue propriétaire). */
export function toJeune(api: ApiJeune): Jeune {
  return {
    ...api,
    filiere: api.filiere,
    filiereId: api.filiereId,
    experiences: api.experiences.map(toExperience),
    liens: api.liens.map((lien) => ({ ...lien, type: lien.type as LienType })),
  };
}

/**
 * Vue publique d'un talent (moteur de recherche recruteur).
 *
 * L'API omet volontairement email, téléphone et liens : on remplit ces champs
 * avec des valeurs vides plutôt que de dupliquer tous les composants qui
 * attendent un `Jeune`. Rien n'est inventé — l'absence reste visible.
 */
export function toJeuneFromPublic(api: ApiJeunePublic): Jeune {
  return {
    ...api,
    filiere: api.filiere,
    filiereId: api.filiereId,
    email: "",
    telephone: "",
    liens: [],
    experiences: api.experiences.map(toExperience),
  };
}

function toExperience(api: ApiJeune["experiences"][number]): Experience {
  return { ...api, type: api.type as Experience["type"] };
}

/**
 * Libellé relatif (« Il y a 2 heures »).
 *
 * Le frontend historique stockait ce libellé en dur pour éviter une différence
 * entre le rendu serveur et le rendu client. Il est ici calculé dans un
 * composant client uniquement, donc sans risque d'écart d'hydratation.
 */
export function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);

  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Il y a ${hours} heure${hours > 1 ? "s" : ""}`;

  const days = Math.round(hours / 24);
  if (days === 1) return "Hier";
  if (days < 7) return `Il y a ${days} jours`;

  const weeks = Math.round(days / 7);
  if (weeks < 5) return `Il y a ${weeks} semaine${weeks > 1 ? "s" : ""}`;

  const months = Math.round(days / 30);
  if (months < 12) return `Il y a ${months} mois`;

  const years = Math.round(days / 365);
  return `Il y a ${years} an${years > 1 ? "s" : ""}`;
}

/** Avis : le libellé de date relatif est calculé ici, à partir de `createdAt`. */
export function toAvis(api: ApiAvis): Avis {
  return {
    id: api.id,
    formationId: api.formationId,
    auteurNom: api.auteurNom,
    auteurPhoto: api.auteurPhoto,
    note: api.note,
    commentaire: api.commentaire,
    dateLabel: formatRelative(api.createdAt),
    utile: api.utile,
  };
}

export function toNotification(api: ApiNotification): Notification {
  return {
    id: api.id,
    // Nom choisi par le serveur : validé ici, pas supposé valide.
    icon: asIconName(api.icon, "notifications"),
    title: api.title,
    detail: api.detail,
    time: formatRelative(api.createdAt),
    read: api.read,
    href: api.href,
    accent: api.accent,
  };
}
