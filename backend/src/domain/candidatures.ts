/**
 * Progression d'une candidature.
 *
 * Le parcours a quatre étapes ordonnées et trois issues. Les issues ne sont
 * jamais atteintes automatiquement : elles relèvent d'une décision explicite du
 * recruteur (`acceptee`, `refusee`) ou du candidat (`retiree`).
 *
 * Ce module existe parce que le statut n'était pas toujours mis à jour au bon
 * moment : proposer un entretien depuis l'écran des candidatures créait bien
 * l'entretien, mais laissait la candidature sur « envoyée ». Le candidat voyait
 * alors « En attente » alors que son entretien était accepté.
 */
import { CandidatureStatus } from "@prisma/client";

/**
 * Libellés destinés au CANDIDAT.
 *
 * Le serveur en a besoin pour les notifications : celles-ci affichaient la
 * valeur brute de l'enum — « Nouveau statut : preselectionnee ».
 */
export const LIBELLES: Record<CandidatureStatus, string> = {
  [CandidatureStatus.envoyee]: "En attente",
  [CandidatureStatus.vue]: "Vue par l'entreprise",
  [CandidatureStatus.preselectionnee]: "Présélectionnée",
  [CandidatureStatus.entretien]: "Entretien proposé",
  [CandidatureStatus.acceptee]: "Acceptée",
  [CandidatureStatus.refusee]: "Non retenue",
  [CandidatureStatus.retiree]: "Retirée",
};

/** Étapes franchissables, dans l'ordre. Les issues n'y figurent pas. */
export const PARCOURS: readonly CandidatureStatus[] = [
  CandidatureStatus.envoyee,
  CandidatureStatus.vue,
  CandidatureStatus.preselectionnee,
  CandidatureStatus.entretien,
] as const;

/**
 * Faut-il faire progresser la candidature vers `cible` ?
 *
 * Uniquement vers l'AVANT, et uniquement entre étapes du parcours :
 *  • une candidature déjà `acceptee` ne redescend pas à `entretien` ;
 *  • une candidature `refusee` ou `retiree` ne se rouvre pas toute seule ;
 *  • repasser de `entretien` à `vue` n'aurait aucun sens.
 */
export function doitAvancerVers(
  actuel: CandidatureStatus,
  cible: CandidatureStatus,
): boolean {
  const depuis = PARCOURS.indexOf(actuel);
  const vers = PARCOURS.indexOf(cible);
  return depuis !== -1 && vers !== -1 && vers > depuis;
}

/** Issues du recruteur : elles ferment le dossier, dans un sens ou dans l'autre. */
const ISSUES: readonly CandidatureStatus[] = [
  CandidatureStatus.acceptee,
  CandidatureStatus.refusee,
] as const;

/**
 * Statuts qu'un recruteur peut poser, compte tenu du statut actuel.
 *
 * Trois règles, dans cet ordre :
 *
 *  1. `retiree` est TERMINAL. Le retrait appartient au candidat ; le laisser
 *     écraser revenait à « accepter » quelqu'un qui s'était désisté, et à le
 *     lui notifier.
 *  2. On n'avance que vers l'AVANT dans le parcours. Repasser une candidature
 *     acceptée à « vue » contredisait le suivi affiché au candidat, qui ne
 *     recule jamais.
 *  3. Une issue déjà posée ne peut être que CORRIGÉE par l'autre issue —
 *     un refus prononcé par erreur reste rattrapable, sans pour autant rouvrir
 *     un dossier clos au milieu du parcours.
 */
export function transitionsRecruteur(actuel: CandidatureStatus): CandidatureStatus[] {
  if (actuel === CandidatureStatus.retiree) return [];

  if (ISSUES.includes(actuel)) {
    return ISSUES.filter((issue) => issue !== actuel);
  }

  const depuis = PARCOURS.indexOf(actuel);
  const suivantes = depuis === -1 ? [] : PARCOURS.slice(depuis + 1);
  return [...suivantes, ...ISSUES];
}

/** Le recruteur peut-il poser ce statut ? */
export function transitionRecruteurAutorisee(
  actuel: CandidatureStatus,
  cible: CandidatureStatus,
): boolean {
  return transitionsRecruteur(actuel).includes(cible);
}
