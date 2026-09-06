/**
 * Rappels d'entretien.
 *
 * Un entretien est stocké en deux morceaux : `date` à minuit UTC et `heure`
 * comme heure MURALE (« 14:00 »). Ni l'un ni l'autre n'est un instant : pour
 * savoir quand prévenir, il faut résoudre cette heure murale dans le fuseau de
 * l'application.
 *
 * Tout est fait avec `Intl`, sans dépendance : la table des fuseaux du runtime
 * connaît déjà les changements d'heure, là où un décalage codé en dur se
 * tromperait deux fois par an.
 */

/** Une heure avant, en millisecondes. */
export const DELAI_RAPPEL_MS = 60 * 60 * 1000;

/**
 * Décalage du fuseau, en millisecondes, à un instant donné.
 *
 * Positif à l'est de Greenwich. Calculé À CET INSTANT précis, parce qu'il
 * change avec l'heure d'été.
 */
function decalage(instant: Date, timeZone: string): number {
  // `en-US` sert de format pivot connu ; seule la valeur numérique compte.
  const enZone = new Date(instant.toLocaleString("en-US", { timeZone }));
  const enUtc = new Date(instant.toLocaleString("en-US", { timeZone: "UTC" }));
  return enZone.getTime() - enUtc.getTime();
}

/**
 * Instant réel du début d'un entretien.
 *
 * @param date `YYYY-MM-DD`, ou la `Date` à minuit UTC issue de la base.
 * @param heure `HH:MM`, heure murale dans `timeZone`.
 * @returns `null` si la date ou l'heure ne sont pas exploitables — un rappel
 * vaut mieux non envoyé qu'envoyé au mauvais moment.
 */
export function instantEntretien(
  date: Date | string,
  heure: string,
  timeZone: string,
): Date | null {
  const jour = typeof date === "string" ? date : date.toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(jour) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(heure)) return null;

  // On lit d'abord l'heure murale COMME SI elle était en UTC, puis on retire le
  // décalage du fuseau à cet instant-là. Une seule correction suffit : le
  // décalage ne varie pas à l'intérieur de la fenêtre qu'elle déplace, sauf à
  // la minute exacte d'un changement d'heure.
  const commeUtc = new Date(`${jour}T${heure}:00.000Z`);
  if (Number.isNaN(commeUtc.getTime())) return null;

  return new Date(commeUtc.getTime() - decalage(commeUtc, timeZone));
}

/**
 * Faut-il envoyer le rappel maintenant ?
 *
 * Vrai dans la fenêtre `]début - 1h - tolérance ; début - 1h]`, où la tolérance
 * est la période de balayage : le planificateur ne tourne pas en continu, et
 * sans elle un entretien dont l'échéance tombe entre deux passages ne serait
 * jamais rappelé.
 *
 * Un entretien dont l'heure est DÉJÀ passée n'est jamais rappelé : prévenir
 * après coup n'aide personne et ferait paraître le service défaillant.
 */
export function doitEnvoyerRappel(
  debut: Date,
  maintenant: Date,
  toleranceMs: number,
): boolean {
  const restant = debut.getTime() - maintenant.getTime();
  if (restant <= 0) return false;
  return restant <= DELAI_RAPPEL_MS && restant > DELAI_RAPPEL_MS - toleranceMs;
}

/**
 * Bornes de dates à interroger pour un balayage.
 *
 * La colonne `date` est un jour à minuit UTC ; on encadre largement — la veille
 * et le lendemain — pour ne pas manquer un entretien du fait du décalage entre
 * jour local et jour UTC. Le tri fin est fait ensuite, entretien par entretien.
 */
export function fenetreDeBalayage(maintenant: Date): { debut: Date; fin: Date } {
  const debut = new Date(maintenant.getTime() - 24 * 60 * 60 * 1000);
  const fin = new Date(maintenant.getTime() + 48 * 60 * 60 * 1000);
  debut.setUTCHours(0, 0, 0, 0);
  fin.setUTCHours(0, 0, 0, 0);
  return { debut, fin };
}
