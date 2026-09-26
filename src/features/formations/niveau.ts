/**
 * Teinte d'un niveau de formation — partagée par les filtres du catalogue et
 * les cartes.
 *
 * Le filtre « Débutant » et les cartes débutant portent la même couleur : on
 * repère le niveau d'un cours sans lire son étiquette. Du vert à l'orange, dans
 * l'ordre de la difficulté ; « Tous niveaux » reste dans la couleur de marque.
 */
const NIVEAU_POINT: Record<string, string> = {
  Débutant: "bg-success",
  Intermédiaire: "bg-secondary-container",
  Avancé: "bg-warning",
  "Tous niveaux": "bg-primary/60",
};

const NIVEAU_PASTILLE: Record<string, string> = {
  Débutant: "bg-success-container text-on-success-container",
  Intermédiaire: "bg-secondary-container text-on-secondary-container",
  Avancé: "bg-warning-container text-on-warning-container",
  "Tous niveaux": "bg-primary/10 text-primary",
};

/** Couleur pleine — pastille de filtre. Un niveau inconnu reste neutre. */
export function pointNiveau(niveau: string): string {
  return NIVEAU_POINT[niveau] ?? "bg-outline";
}

/** Fond clair et texte lisible — étiquette de carte. */
export function pastilleNiveau(niveau: string): string {
  return NIVEAU_PASTILLE[niveau] ?? "bg-surface-container text-on-surface-variant";
}
