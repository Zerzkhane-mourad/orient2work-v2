/**
 * La semaine en cours, lundi → dimanche, prête à tracer.
 *
 * ── Pourquoi une semaine fixe et non « les 7 derniers jours » ───────────────
 *
 * Une fenêtre glissante fait commencer l'axe un jour différent à chaque
 * consultation : impossible de comparer la courbe d'aujourd'hui à celle
 * d'hier, ni de dire « le mercredi est creux ». La semaine calendaire donne un
 * repère stable, et c'est la maille à laquelle une équipe planifie.
 *
 * Elle contient donc des jours PASSÉS et des jours À VENIR ; les compteurs
 * qu'on y verse doivent l'assumer (des entretiens planifiés, par exemple, se
 * lisent dans les deux sens).
 *
 * ── Heure locale, partout ───────────────────────────────────────────────────
 *
 * Les dates de l'API sont des `YYYY-MM-DD` sans fuseau. Les comparer via
 * `toISOString()` décalerait d'un jour à l'ouest de Greenwich : tout passe donc
 * par les composantes locales.
 */

export interface JourSemaine {
  /** `YYYY-MM-DD`, clé de regroupement. */
  iso: string;
  /** Libellé d'axe court — « lun. ». */
  label: string;
  /** Quantième, pour la pastille d'infobulle. */
  quantieme: string;
  /** Date complète — « lundi 8 septembre ». */
  complet: string;
}

const JOUR_COURT = new Intl.DateTimeFormat("fr-FR", { weekday: "short" });
const JOUR_COMPLET = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

/** `YYYY-MM-DD` d'une date, en heure locale. */
export function jourIso(date: Date): string {
  const mois = String(date.getMonth() + 1).padStart(2, "0");
  const jour = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mois}-${jour}`;
}

/**
 * Les sept jours de la semaine courante.
 *
 * `getDay()` rend 0 pour dimanche : le décalage `(jour + 6) % 7` fait de lundi
 * le premier jour, convention française — un axe qui commencerait au dimanche
 * se lirait de travers ici.
 */
export function semaineCourante(reference = new Date()): JourSemaine[] {
  const lundi = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  lundi.setDate(lundi.getDate() - ((lundi.getDay() + 6) % 7));

  return Array.from({ length: 7 }, (_, index) => {
    const jour = new Date(lundi);
    jour.setDate(lundi.getDate() + index);
    return {
      iso: jourIso(jour),
      // Les jours abrégés du français portent un point (« lun. ») : retiré,
      // l'axe reste net sous une courbe déjà chargée en repères.
      label: JOUR_COURT.format(jour).replace(".", ""),
      quantieme: String(jour.getDate()),
      complet: JOUR_COMPLET.format(jour),
    };
  });
}

/**
 * Compte des éléments par jour, sur la semaine donnée.
 *
 * Les jours SANS élément valent zéro et restent présents : une courbe qui
 * sauterait les jours vides mentirait sur la forme de la semaine — deux jours
 * consécutifs à l'écran seraient séparés de trois jours dans les faits.
 *
 * @param dateDe extrait la date d'un élément (`YYYY-MM-DD` ou ISO complet).
 */
export function compterParJour<T>(
  elements: readonly T[],
  jours: readonly JourSemaine[],
  dateDe: (element: T) => string,
): Record<string, number> {
  const compte: Record<string, number> = Object.fromEntries(jours.map((j) => [j.iso, 0]));

  for (const element of elements) {
    // Les dix premiers caractères d'un ISO complet sont sa date ; un
    // `YYYY-MM-DD` nu est déjà à la bonne forme.
    const cle = dateDe(element).slice(0, 10);
    if (cle in compte) compte[cle] += 1;
  }

  return compte;
}
