/**
 * Avancement d'une candidature.
 *
 * Le rail affiché sur la fiche ne comptait que trois étapes — envoyée, vue,
 * entretien — et y rangeait de force les deux autres statuts :
 *  • `preselectionnee` retombait sur « Vue », si bien qu'une présélection, la
 *    meilleure nouvelle avant l'entretien, ne se voyait pas ;
 *  • `acceptee` s'arrêtait sur « Entretien », donnant une candidature aboutie
 *    pour une candidature en cours.
 *
 * Le parcours réel a quatre étapes et deux issues. Il est décrit ici, une fois,
 * sous forme de table exhaustive : ajouter un statut à `CandidatureStatus` fait
 * échouer la compilation tant qu'on n'a pas dit où il se range.
 */
import type { IconName } from "@/components/ui/icon";
import type { CandidatureStatus } from "@/lib/api/types";

export const PIPELINE = ["envoyee", "vue", "preselectionnee", "entretien"] as const;

export const PIPELINE_LABELS: Record<(typeof PIPELINE)[number], string> = {
  envoyee: "Envoyée",
  vue: "Vue",
  preselectionnee: "Présélection",
  entretien: "Entretien",
};

export interface Avancement {
  /** Étapes franchies, de 0 à `PIPELINE.length`. */
  franchies: number;
  /** Clôturée sans suite : le rail n'a plus lieu d'être affiché. */
  close: boolean;
  /** Menée à son terme. */
  aboutie: boolean;
}

/** Table exhaustive : chaque statut dit explicitement où il se situe. */
const AVANCEMENT: Record<CandidatureStatus, Avancement> = {
  envoyee: { franchies: 1, close: false, aboutie: false },
  vue: { franchies: 2, close: false, aboutie: false },
  preselectionnee: { franchies: 3, close: false, aboutie: false },
  entretien: { franchies: 4, close: false, aboutie: false },
  // Aboutie : toutes les étapes sont derrière elle.
  acceptee: { franchies: PIPELINE.length, close: false, aboutie: true },
  refusee: { franchies: 0, close: true, aboutie: false },
  retiree: { franchies: 0, close: true, aboutie: false },
};

export function avancement(status: CandidatureStatus): Avancement {
  return AVANCEMENT[status];
}

/* ── Vocabulaire de statut, partagé par les deux espaces ─────────────────── */

/**
 * Teinte et icône d'un statut.
 *
 * Elles décrivent l'ÉTAT, pas le lecteur : une candidature acceptée est verte
 * des deux côtés. Chaque espace en avait sa propre copie, et elles avaient déjà
 * commencé à diverger.
 */
export const STATUT_TON: Record<
  CandidatureStatus,
  "info" | "primary" | "gold" | "success" | "error" | "neutral"
> = {
  envoyee: "info",
  vue: "primary",
  preselectionnee: "gold",
  entretien: "success",
  acceptee: "success",
  refusee: "error",
  retiree: "neutral",
};

export const STATUT_ICONE: Record<CandidatureStatus, IconName> = {
  envoyee: "schedule",
  vue: "visibility",
  preselectionnee: "star",
  entretien: "event_available",
  acceptee: "check_circle",
  refusee: "do_not_disturb_on",
  retiree: "undo",
};

/**
 * Libellés du CANDIDAT — il lit ce qu'on lui a fait.
 *
 * Volontairement distincts de ceux du recruteur, et posés côte à côte pour que
 * l'écart reste un choix visible : « Vue » du côté entreprise décrit une action
 * qu'elle vient de faire, « Vue par l'entreprise » côté jeune une nouvelle
 * qu'il reçoit.
 */
export const LIBELLE_JEUNE: Record<CandidatureStatus, string> = {
  envoyee: "En attente",
  vue: "Vue par l'entreprise",
  preselectionnee: "Présélectionné",
  entretien: "Entretien proposé",
  acceptee: "Acceptée",
  refusee: "Non retenue",
  retiree: "Retirée",
};

/** Libellés du RECRUTEUR — il lit l'état de son propre traitement. */
export const LIBELLE_ENTREPRISE: Record<CandidatureStatus, string> = {
  envoyee: "Nouvelle",
  vue: "Vue",
  preselectionnee: "Présélectionnée",
  entretien: "Entretien",
  acceptee: "Acceptée",
  refusee: "Refusée",
  retiree: "Retirée par le candidat",
};

/* ── Transitions ouvertes au recruteur ───────────────────────────────────── */

/** Issues : elles ferment le dossier, dans un sens ou dans l'autre. */
const ISSUES: readonly CandidatureStatus[] = ["acceptee", "refusee"] as const;

/**
 * Statuts que le recruteur peut poser depuis l'état courant.
 *
 * MIROIR de `domain/candidatures.ts` côté serveur, qui reste seul juge. Le
 * menu n'offrait aucune restriction : on pouvait choisir « Vue » sur une
 * candidature acceptée, ou statuer sur une candidature retirée — deux
 * requêtes que l'API rejette désormais en 409.
 */
export function transitionsRecruteur(actuel: CandidatureStatus): CandidatureStatus[] {
  if (actuel === "retiree") return [];
  if (ISSUES.includes(actuel)) return ISSUES.filter((issue) => issue !== actuel);

  const depuis = PIPELINE.indexOf(actuel as (typeof PIPELINE)[number]);
  const suivantes = depuis === -1 ? [] : PIPELINE.slice(depuis + 1);
  return [...suivantes, ...ISSUES];
}
