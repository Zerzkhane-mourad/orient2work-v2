/**
 * Échéance d'une offre — combien de jours reste-t-il, et faut-il s'en alarmer.
 *
 * ── Pourquoi une date limite ne suffit pas ──────────────────────────────────
 *
 * « Limite : 12 septembre 2026 » demande au lecteur de faire la soustraction,
 * chaque fois, pour chaque ligne. C'est exactement ce qu'une interface doit
 * éviter de déléguer : le recruteur qui parcourt ses dix offres veut savoir
 * lesquelles ferment CETTE SEMAINE, pas quelles dates elles portent.
 *
 * Le calcul est volontairement fait sur des JOURS CALENDAIRES et non sur des
 * millisecondes : à 23h, une offre qui ferme demain doit dire « demain », pas
 * « dans 1 heure ». Les deux dates sont donc ramenées à minuit local avant la
 * différence.
 */

export interface Echeance {
  /** Jours restants ; négatif si la date est passée. */
  jours: number;
  /** Libellé prêt à afficher — « Ferme demain », « 5 jours restants »… */
  label: string;
  /**
   * Ton de pastille correspondant, aligné sur les tons de `Badge`.
   * `error` passé la date, `warning` sous une semaine, `neutral` au-delà.
   */
  ton: "neutral" | "warning" | "error";
  /** Vrai sous une semaine ou déjà dépassé : ce qui mérite d'être signalé. */
  urgent: boolean;
}

/** Seuil d'alerte : une semaine, la maille à laquelle on planifie son travail. */
const SEUIL_URGENCE = 7;

const minuitLocal = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

/** @param dateLimite `YYYY-MM-DD`. */
export function echeance(dateLimite: string): Echeance {
  // Midi, pour la même raison que dans `DatePill` : un `YYYY-MM-DD` nu se lit
  // en UTC et reculerait d'un jour à l'ouest de Greenwich.
  const limite = minuitLocal(new Date(`${dateLimite}T12:00:00`));
  const jours = Math.round((limite - minuitLocal(new Date())) / 86_400_000);

  if (jours < 0) return { jours, label: "Expirée", ton: "error", urgent: true };
  if (jours === 0) return { jours, label: "Ferme aujourd'hui", ton: "error", urgent: true };
  if (jours === 1) return { jours, label: "Ferme demain", ton: "warning", urgent: true };
  if (jours <= SEUIL_URGENCE)
    return { jours, label: `${jours} jours restants`, ton: "warning", urgent: true };

  return { jours, label: `${jours} jours restants`, ton: "neutral", urgent: false };
}
