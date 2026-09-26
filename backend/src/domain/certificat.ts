/**
 * Référence d'un certificat de formation.
 *
 * Le format vivait dans `certificat.service`, seul à en avoir besoin. Depuis
 * que la fiche talent affiche la référence des formations validées d'un
 * candidat, deux endroits la composent — et deux endroits qui composent la même
 * chaîne finissent par diverger. Elle se construit donc ici, une fois.
 *
 * `O2W-CERT-2026-00042` : l'année de DÉLIVRANCE, puis le numéro de séquence sur
 * cinq chiffres. L'année vient du fuseau de l'application, pas de celui du
 * serveur — un certificat délivré le 1er janvier à 00h30 à Casablanca ne doit
 * pas porter l'année précédente parce que la machine tourne en UTC.
 */

export function formatNumeroCertificat(numero: number): string {
  return String(numero).padStart(5, "0");
}

/** Jour, mois, année dans le fuseau donné — pour le PDF comme pour la référence. */
export function partsDateCertificat(
  date: Date,
  timeZone: string,
): { jour: string; mois: string; annee: string } {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return { jour: get("day"), mois: get("month"), annee: get("year") };
}

export function referenceCertificat(numero: number, date: Date, timeZone: string): string {
  return `O2W-CERT-${partsDateCertificat(date, timeZone).annee}-${formatNumeroCertificat(numero)}`;
}
