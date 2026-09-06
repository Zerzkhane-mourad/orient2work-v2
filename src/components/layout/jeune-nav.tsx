"use client";

/**
 * Navigation de l'Espace Jeune — SOURCE UNIQUE, desktop et mobile.
 *
 * `lib/navigation.ts` porte les menus des espaces à barre latérale
 * (`AppShell`) ; l'Espace Jeune a sa barre supérieure et lit cette liste.
 *
 * Le partage entre les deux barres n'est pas cosmétique : sur mobile, la barre
 * du bas ne tient QUE cinq cibles confortables au pouce. Les destinations sont
 * donc classées par fréquence d'usage réelle — chercher, suivre, répondre — et
 * le reste passe dans une feuille « Plus ». Le sixième onglet compressé aurait
 * rendu les cinq autres moins sûrs à atteindre.
 */
import type { IconName } from "@/components/ui/icon";

export interface Destination {
  label: string;
  href: string;
  icon: IconName;
  /** Libellé abrégé pour la barre du bas, où la place manque. */
  court?: string;
}

/** Les trois boucles quotidiennes : chercher, suivre, répondre. Plus l'accueil. */
export const NAV_PRINCIPALE: readonly Destination[] = [
  { label: "Accueil", href: "/espace-jeune", icon: "dashboard" },
  { label: "Offres", href: "/espace-jeune/offres", icon: "work" },
  { label: "Candidatures", href: "/espace-jeune/candidatures", icon: "send", court: "Suivi" },
  { label: "Entretiens", href: "/espace-jeune/entretiens", icon: "event", court: "RDV" },
];

/** Destinations occasionnelles : la barre du haut les montre, « Plus » les reprend. */
export const NAV_SECONDAIRE: readonly Destination[] = [
  // Sollicitation directe : le recours quand aucune annonce ne correspond.
  { label: "Candidature spontanée", href: "/espace-jeune/candidature-spontanee", icon: "handshake" },
  { label: "Formations", href: "/espace-jeune/formations", icon: "school" },
];

/** Ce qui relève du compte, et non du parcours de recherche. */
export const NAV_COMPTE: readonly Destination[] = [
  { label: "Mon profil", href: "/espace-jeune/profil", icon: "person" },
  { label: "Mes documents", href: "/espace-jeune/documents", icon: "description" },
  { label: "Mon test", href: "/espace-jeune/test", icon: "assignment" },
  { label: "Paramètres", href: "/espace-jeune/parametres", icon: "settings" },
];

/** Barre du haut, sur écran large : tout le parcours de recherche d'un coup. */
export const NAV_DESKTOP: readonly Destination[] = [
  NAV_PRINCIPALE[0]!,
  NAV_PRINCIPALE[1]!,
  ...NAV_SECONDAIRE,
  NAV_PRINCIPALE[2]!,
  NAV_PRINCIPALE[3]!,
];

/**
 * Onglets de la barre du BAS, sur mobile.
 *
 * ── Le modèle LinkedIn ──────────────────────────────────────────────────────
 *
 * Les notifications y sont un ONGLET, pas une cloche dans la barre du haut.
 * C'est le mécanisme par lequel on apprend qu'il se passe quelque chose : une
 * pastille sur un onglet permanent se voit du coin de l'œil, un menu déroulant
 * en haut d'écran demande qu'on aille le chercher.
 *
 * ── Ce que cela coûte, et pourquoi c'est accepté ────────────────────────────
 *
 * Cinq cibles au maximum : quatre onglets plus « Plus ». Les notifications
 * prennent donc la place des ENTRETIENS, qui redescendent dans la feuille.
 * L'arbitrage se tient parce que c'est précisément une notification qui
 * annonce un entretien : on y arrive par l'alerte, pas en allant vérifier.
 *
 * Un sixième onglet réduirait chaque cible à une cinquantaine de pixels sur un
 * téléphone étroit, et l'on ouvrirait le voisin.
 *
 * Cette liste est distincte de `NAV_PRINCIPALE` : la barre du haut, sur grand
 * écran, garde son ordre à elle.
 */
export const NAV_ONGLETS_MOBILE: readonly Destination[] = [
  NAV_PRINCIPALE[0]!,
  NAV_PRINCIPALE[1]!,
  NAV_PRINCIPALE[2]!,
  {
    label: "Notifications",
    href: "/espace-jeune/notifications",
    icon: "notifications",
    court: "Alertes",
  },
];

/**
 * Ce que reprend la feuille « Plus » : tout ce qui n'a PAS d'onglet.
 *
 * Calculé, jamais recopié. Une destination ajoutée à `NAV_PRINCIPALE` ou à
 * `NAV_SECONDAIRE` sans onglet apparaît ici d'elle-même — sans ce calcul, elle
 * deviendrait tout simplement inatteignable sur mobile, et rien ne le
 * signalerait.
 */
const HREFS_ONGLETS = new Set(NAV_ONGLETS_MOBILE.map((d) => d.href));

export const NAV_PLUS_RECHERCHE: readonly Destination[] = [
  ...NAV_PRINCIPALE,
  ...NAV_SECONDAIRE,
].filter((d) => !HREFS_ONGLETS.has(d.href));

/**
 * Écrans SANS barre d'onglets.
 *
 * Le test de validation est chronométré et ne se reprend pas : une barre de
 * navigation permanente y proposerait de le quitter à chaque instant, et sa
 * position fixe recouvrirait la barre d'action de l'épreuve — « Précédent » et
 * « Suivant » deviendraient inatteignables au pouce.
 */
const ROUTES_IMMERSIVES = ["/espace-jeune/test/en-cours"];

export function estImmersif(chemin: string): boolean {
  return ROUTES_IMMERSIVES.some((route) => chemin.startsWith(route));
}

/**
 * L'accueil ne s'active que sur correspondance EXACTE.
 *
 * `startsWith` le laisserait allumé sur toutes les pages de l'espace, puisque
 * toutes commencent par `/espace-jeune`.
 */
export function estActif(href: string, chemin: string): boolean {
  return href === "/espace-jeune" ? chemin === href : chemin.startsWith(href);
}
