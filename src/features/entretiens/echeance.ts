/**
 * « Dans combien de temps » — l'information que le candidat cherche d'abord.
 *
 * Une date brute (« 28 août à 10:00 ») oblige à un calcul mental pour savoir
 * s'il faut s'y préparer maintenant ou dans trois semaines. Le compte à rebours
 * répond directement.
 *
 * Le raisonnement se fait en JOURS DE CALENDRIER, pas en heures écoulées : un
 * entretien demain à 8h est « demain », même s'il n'est que dans 14 heures.
 * Compter en heures dirait « aujourd'hui » à 23h la veille — ce que personne ne
 * comprend ainsi.
 */

/** Minuit LOCAL — jamais `toISOString`, qui bascule en UTC. */
function minuitLocal(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/**
 * Jour d'un entretien, en heure locale.
 *
 * La date vient de l'API au format `YYYY-MM-DD` : elle décrit un JOUR, pas un
 * instant. `new Date("2026-08-28")` l'interpréterait en UTC et reculerait d'un
 * jour dans tout fuseau négatif ; le suffixe `T12:00:00` la fixe en milieu de
 * journée locale, hors d'atteinte de tout décalage.
 */
export function jourLocal(dateIso: string): Date {
  return new Date(`${dateIso}T12:00:00`);
}

export interface Echeance {
  /** Nombre de jours de calendrier ; négatif pour un entretien passé. */
  jours: number;
  /** « Aujourd'hui », « Demain », « Dans 3 jours »… */
  libelle: string;
  /** Aujourd'hui ou demain : mérite d'être signalé visuellement. */
  imminent: boolean;
  passe: boolean;
}

export function echeance(dateIso: string, maintenant: Date = new Date()): Echeance {
  const jours = Math.round(
    (minuitLocal(jourLocal(dateIso)) - minuitLocal(maintenant)) / 86_400_000,
  );

  return {
    jours,
    libelle: libelleDelai(jours),
    imminent: jours === 0 || jours === 1,
    passe: jours < 0,
  };
}

function libelleDelai(jours: number): string {
  if (jours === 0) return "Aujourd'hui";
  if (jours === 1) return "Demain";
  if (jours === -1) return "Hier";
  if (jours < 0) {
    const passes = -jours;
    // Au-delà d'un mois, le nombre de jours ne dit plus rien d'utile.
    if (passes >= 30) return `Il y a ${Math.round(passes / 30)} mois`;
    if (passes >= 7) return `Il y a ${Math.floor(passes / 7)} semaine${passes >= 14 ? "s" : ""}`;
    return `Il y a ${passes} jours`;
  }
  if (jours < 7) return `Dans ${jours} jours`;
  if (jours < 30) {
    const semaines = Math.floor(jours / 7);
    return `Dans ${semaines} semaine${semaines > 1 ? "s" : ""}`;
  }
  return `Dans ${Math.round(jours / 30)} mois`;
}
