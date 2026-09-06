/**
 * Créneaux réservables, déduits des DATES programmées par l'entreprise.
 *
 * L'entreprise ouvre des journées précises et leur donne des horaires ; les
 * créneaux concrets en sont calculés à la demande. Les matérialiser en base
 * obligerait à les régénérer au moindre changement d'horaire.
 *
 * Il n'y a plus de semaine type : une journée est ouverte parce qu'elle a été
 * programmée, point. Une date absente n'est pas réservable — inutile, donc, de
 * pouvoir « fermer » une date : il suffit de ne pas la programmer.
 *
 * Tout est traité en heures LOCALES sous forme de chaînes (`YYYY-MM-DD`,
 * `HH:MM`), comme le fait déjà `Entretien` (`@db.Date` + `heure` texte).
 * Convertir en `Date` UTC ferait glisser un créneau de 9h00 d'une heure au
 * changement d'heure, ou le ferait changer de jour près de minuit.
 */

/** Plage horaire ouverte : « de 9h00 à 12h00 ». */
export interface PlageHoraire {
  debut: string;
  fin: string;
}

/** Journée programmée et ses plages. Une journée sans plage n'est pas ouverte. */
export interface DateDisponible {
  /** `YYYY-MM-DD`. */
  date: string;
  plages: PlageHoraire[];
}

/** Créneau déjà pris — un entretien non annulé. */
export interface CreneauReserve {
  date: string;
  heure: string;
}

export interface JourneeCreneaux {
  /** `YYYY-MM-DD`. */
  date: string;
  /** Heures encore libres, ordonnées. */
  creneaux: string[];
}

/** `"09:30"` → 570. `-1` si la forme n'est pas reconnue. */
export function enMinutes(heure: string): number {
  const m = /^(\d{2}):(\d{2})$/.exec(heure);
  if (!m) return -1;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return -1;
  return h * 60 + min;
}

/** 570 → `"09:30"`. */
export function enHeure(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * `YYYY-MM-DD` d'une colonne `@db.Date`.
 *
 * Ces colonnes sont écrites à MINUIT UTC (`dateOnlySchema`) et doivent être
 * relues en UTC. Les lire avec les accesseurs locaux ferait reculer la date
 * d'un jour dans tout fuseau négatif — un créneau réservé resterait alors
 * affiché comme libre, et un autre disparaîtrait sans raison.
 */
export function dateIsoUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** `YYYY-MM-DD` d'une date, en heure LOCALE (jamais `toISOString`, qui passe en UTC). */
export function dateLocale(date: Date): string {
  const mois = String(date.getMonth() + 1).padStart(2, "0");
  const jour = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mois}-${jour}`;
}

/**
 * Ce qui rend une plage inexploitable, ou `null` si elle est valide.
 *
 * Une plage plus courte qu'un créneau ne produirait rien : l'entreprise
 * croirait avoir ouvert une journée sans que personne ne puisse réserver.
 */
export function problemePlage(plage: PlageHoraire, dureeMin: number): string | null {
  const debut = enMinutes(plage.debut);
  const fin = enMinutes(plage.fin);

  if (debut < 0 || fin < 0) return "Heures attendues au format HH:MM.";
  if (fin <= debut) return "L'heure de fin doit suivre l'heure de début.";
  if (fin - debut < dureeMin) {
    return `La plage doit durer au moins ${dureeMin} minutes pour contenir un créneau.`;
  }
  return null;
}

/**
 * Plages d'une même journée qui se chevauchent, s'il y en a.
 *
 * Deux plages superposées ne cassent pas le calcul — les créneaux sont
 * dédoublonnés — mais elles trahissent une saisie fautive : « 9h-12h » puis
 * « 11h-14h » n'est jamais ce qu'on a voulu écrire.
 *
 * @returns le premier couple en conflit, ou `null`.
 */
export function chevauchement(plages: PlageHoraire[]): [PlageHoraire, PlageHoraire] | null {
  // Triées par début : il suffit alors de comparer chaque plage à la suivante.
  const ordonnees = [...plages].sort((a, b) => enMinutes(a.debut) - enMinutes(b.debut));

  for (let i = 1; i < ordonnees.length; i++) {
    const precedente = ordonnees[i - 1]!;
    const courante = ordonnees[i]!;
    // Bout à bout (« 9h-12h » puis « 12h-14h ») est licite : la borne de fin
    // est exclue, aucun créneau n'est produit deux fois.
    if (enMinutes(courante.debut) < enMinutes(precedente.fin)) {
      return [precedente, courante];
    }
  }
  return null;
}

interface Params {
  /** Journées programmées par l'entreprise. */
  dates: DateDisponible[];
  /** Durée d'un créneau, en minutes. */
  dureeMin: number;
  /** Horizon de réservation, en semaines à partir d'aujourd'hui. */
  semaines: number;
  reserves: CreneauReserve[];
  /** Instant de référence — passé explicitement pour rester testable. */
  maintenant: Date;
}

/**
 * Créneaux encore libres, jour par jour.
 *
 * Seules les journées programmées sont parcourues — et non tout l'horizon jour
 * par jour : une entreprise qui ouvre trois dates ne fait examiner que trois
 * journées. Les journées sans aucun créneau libre sont omises : le calendrier
 * du candidat n'affiche que ce sur quoi on peut cliquer.
 */
export function creneauxOuverts({
  dates,
  dureeMin,
  semaines,
  reserves,
  maintenant,
}: Params): JourneeCreneaux[] {
  if (dureeMin <= 0 || semaines <= 0 || dates.length === 0) return [];

  // Recherche en O(1) : la liste des réservations peut être longue.
  const pris = new Set(reserves.map((r) => `${r.date}T${r.heure}`));

  const aujourdhui = dateLocale(maintenant);
  const minutesActuelles = maintenant.getHours() * 60 + maintenant.getMinutes();

  // Borne haute de l'horizon, en date locale comparable aux clés `YYYY-MM-DD`.
  const limite = new Date(maintenant);
  limite.setDate(limite.getDate() + semaines * 7 - 1);
  const derniereDate = dateLocale(limite);

  const journees: JourneeCreneaux[] = [];

  // Ordonnées : les dates arrivent dans l'ordre d'enregistrement.
  for (const journee of [...dates].sort((a, b) => a.date.localeCompare(b.date))) {
    // Hors horizon — passé ou trop loin.
    if (journee.date < aujourdhui || journee.date > derniereDate) continue;

    /*
     * `Set` : deux plages qui se chevauchent — par erreur de saisie — produiraient
     * deux fois la même heure. Le candidat verrait « 10:00 » en double.
     */
    const heures = new Set<string>();

    for (const plage of journee.plages) {
      // Une plage incohérente est ignorée SEULE : les autres plages de la
      // journée restent réservables.
      if (problemePlage(plage, dureeMin)) continue;

      const debut = enMinutes(plage.debut);
      const fin = enMinutes(plage.fin);

      // `+ dureeMin <= fin` : un créneau doit tenir ENTIER dans la plage.
      for (let minute = debut; minute + dureeMin <= fin; minute += dureeMin) {
        // Aujourd'hui, un créneau déjà commencé n'est plus réservable.
        if (journee.date === aujourdhui && minute <= minutesActuelles) continue;

        const heure = enHeure(minute);
        if (pris.has(`${journee.date}T${heure}`)) continue;
        heures.add(heure);
      }
    }

    if (heures.size > 0) {
      journees.push({ date: journee.date, creneaux: [...heures].sort() });
    }
  }

  return journees;
}
