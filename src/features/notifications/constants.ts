/** Réglages du module notifications — un seul endroit pour les ajuster. */

/** Taille d'une page de l'API ; aussi le seuil qui dit s'il en reste. */
export const PAGE_SIZE = 20;

/** Rafraîchissement discret, tant que l'onglet est visible. */
export const REFRESH_MS = 60_000;

/** Délai pendant lequel une suppression peut encore être annulée. */
export const UNDO_MS = 5_000;

/**
 * Nombre de notifications dans la cloche : un APERÇU. Huit, de quoi voir les
 * nouveautés du moment sans transformer le menu en longue liste ; le reste est
 * à un clic, sur la page dédiée.
 */
export const APERCU_CLOCHE = 8;

/** Au-delà, le compteur d'un filtre s'abrège en « 99+ ». */
export const COMPTEUR_MAX = 99;

/** Au-delà, la pastille posée sur l'icône s'abrège en « 9+ ». */
export const BADGE_MAX = 9;
