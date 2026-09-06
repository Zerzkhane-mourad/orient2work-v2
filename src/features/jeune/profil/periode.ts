/**
 * Période d'une expérience.
 *
 * L'API stocke une CHAÎNE libre (`periode`, 60 caractères, cf.
 * `jeune.validator.ts`). La saisie, elle, se fait au mois : « Juin 2023 –
 * Août 2023 » tapé à la main produisait autant de formats que de candidats
 * (« 06/23 », « été 2023 », « 2023 »), impossibles à trier ou à comparer, et
 * laissait passer une fin antérieure au début.
 *
 * Ces fonctions font donc le pont entre les deux : `YYYY-MM` côté champs — le
 * format d'un `<input type="month">` — et la chaîne lisible côté API.
 *
 * Le mois suffit : personne ne connaît le jour exact du début d'un stage, et le
 * demander n'ajouterait qu'une décision de plus à prendre.
 */

/** Mois en toutes lettres, minuscule — l'usage français hors début de phrase. */
const MOIS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
] as const;

/** Séparateur affiché : demi-cadratin, la ponctuation d'un intervalle. */
const SEPARATEUR = " – ";

const EN_COURS = "aujourd'hui";

export interface Periode {
  /** `YYYY-MM`, ou chaîne vide. */
  debut: string;
  /** `YYYY-MM`, ou chaîne vide si `enCours`. */
  fin: string;
  /** L'expérience est toujours en cours : pas de date de fin. */
  enCours: boolean;
}

export const PERIODE_VIDE: Periode = { debut: "", fin: "", enCours: false };

/** `"2023-06"` → `"juin 2023"`. Chaîne vide si le mois est invalide. */
function moisLisible(valeur: string): string {
  const correspondance = /^(\d{4})-(\d{2})$/.exec(valeur);
  if (!correspondance) return "";

  const index = Number(correspondance[2]) - 1;
  const mois = MOIS[index];
  return mois ? `${mois} ${correspondance[1]}` : "";
}

/** Période prête pour l'API. Chaîne vide si le début manque. */
export function formatPeriode({ debut, fin, enCours }: Periode): string {
  const depuis = moisLisible(debut);
  if (!depuis) return "";

  if (enCours) return `${depuis}${SEPARATEUR}${EN_COURS}`;

  const jusqu = moisLisible(fin);
  // Sans fin renseignée, la période reste exploitable : « depuis juin 2023 »
  // vaut mieux qu'un champ vide ou qu'un intervalle tronqué.
  return jusqu ? `${depuis}${SEPARATEUR}${jusqu}` : `depuis ${depuis}`;
}

/**
 * Relit une période produite par `formatPeriode`.
 *
 * Les valeurs saisies AVANT ce champ sont du texte libre et ne se relisent pas :
 * on renvoie alors `null`, et l'appelant propose une saisie neuve plutôt que de
 * deviner. Perdre la mise en forme d'origine serait pire que la redemander.
 */
export function parsePeriode(periode: string): Periode | null {
  const texte = periode.trim().toLowerCase();
  if (!texte) return null;

  const enCours = texte.endsWith(EN_COURS);
  // Tirets acceptés au sens large : un copier-coller remplace souvent le
  // demi-cadratin par un trait d'union.
  const [gauche, droite] = texte.split(/\s*[–—-]\s*/, 2);

  const depuis = parseMois((gauche ?? "").replace(/^depuis\s+/, ""));
  if (!depuis) return null;

  if (enCours) return { debut: depuis, fin: "", enCours: true };

  // Pas de fin du tout — « depuis juin 2023 » : période valide, rien à relire.
  if (!droite?.trim()) return { debut: depuis, fin: "", enCours: false };

  /*
   * Une fin présente mais illisible rend TOUTE la période illisible.
   *
   * Renvoyer le seul début ferait disparaître la date de fin en silence, sans
   * que rien ne le signale — alors qu'un `null` réaffiche le texte d'origine et
   * laisse le candidat le ressaisir en entier.
   */
  const jusqu = parseMois(droite);
  return jusqu ? { debut: depuis, fin: jusqu, enCours: false } : null;
}

/** Compare sans accents : « aout » et « août » désignent le même mois. */
function sansAccents(valeur: string): string {
  return valeur.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

/** `"juin 2023"` → `"2023-06"`. Chaîne vide si non reconnu. */
function parseMois(fragment: string): string {
  const correspondance = /^(\p{Letter}+)\s+(\d{4})$/u.exec(fragment.trim());
  if (!correspondance) return "";

  // Les saisies antérieures sont du texte libre : l'accent y manque souvent.
  const nom = sansAccents(correspondance[1]!);
  const index = MOIS.findIndex((mois) => sansAccents(mois) === nom);
  if (index === -1) return "";

  return `${correspondance[2]}-${String(index + 1).padStart(2, "0")}`;
}

/**
 * Ce qui empêche d'enregistrer la période, ou `null` si elle est valide.
 *
 * Une fin antérieure au début passait sans broncher : le profil affichait
 * « août 2023 – juin 2023 », que ni le candidat ni le recruteur ne remarquaient.
 */
export function problemePeriode({ debut, fin, enCours }: Periode): string | null {
  if (!debut) return "Indiquez le mois de début.";
  if (enCours || !fin) return null;
  if (fin < debut) return "La date de fin doit suivre la date de début.";
  return null;
}

/** Mois courant au format `YYYY-MM` — borne haute des champs. */
export function moisCourant(maintenant: Date): string {
  return `${maintenant.getFullYear()}-${String(maintenant.getMonth() + 1).padStart(2, "0")}`;
}
