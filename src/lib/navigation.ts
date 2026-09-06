import type { IconName } from "@/components/ui/icon";
/** Navigation maps for each space. Pages (§12) are the source of truth here. */

export interface NavItem {
  label: string;
  href: string;
  icon: IconName;
}

/**
 * Groupe repliable de la barre latérale.
 *
 * Sert aux rubriques qui rassemblent plusieurs écrans de même nature — les
 * référentiels aujourd'hui, d'autres listes de valeurs demain. Le groupe n'a
 * pas de `href` : c'est un conteneur, pas une destination.
 */
export interface NavGroup {
  label: string;
  icon: IconName;
  children: NavItem[];
}

export type NavEntry = NavItem | NavGroup;

export function isNavGroup(entry: NavEntry): entry is NavGroup {
  return "children" in entry;
}

/**
 * Navigation du site public.
 *
 * ── « Accueil » n'y était pas ───────────────────────────────────────────────
 *
 * Conséquence : sur la page la plus visitée du site, AUCUNE entrée n'était
 * active. La barre présentait quatre liens gris identiques, sans repère, et le
 * logo restait le seul chemin de retour — ce que tout le monde connaît, mais
 * que rien n'indique.
 *
 * ── Libellés raccourcis ─────────────────────────────────────────────────────
 *
 * « Pour les jeunes » devient « Jeunes ». Le cadrage par audience se perd un
 * peu, mais il est repris par le titre de la page d'arrivée, et une barre de
 * navigation se PARCOURT du regard : elle se lit en diagonale, pas en phrases.
 *
 * Effet de bord bienvenu : à cinq entrées courtes la capsule mesure environ
 * 430 px, contre 490 px pour les quatre longues. Elle tient donc largement
 * entre 1024 et 1280 px, où les libellés d'origine passaient tout juste.
 */
export const publicNav: NavItem[] = [
  { label: "Accueil", href: "/", icon: "home" },
  { label: "Jeunes", href: "/jeunes", icon: "school" },
  { label: "Entreprises", href: "/entreprises", icon: "business" },
  { label: "À propos", href: "/a-propos", icon: "info" },
  { label: "Contact", href: "/contact", icon: "mail" },
];

/*
 * `jeuneNav` a été retiré : il n'était lu par personne.
 *
 * L'Espace Jeune est passé à une barre SUPÉRIEURE (`JeuneShell`), qui porte sa
 * propre liste ; ce tableau était un reste de la version à barre latérale.
 * Le laisser coûtait cher : une entrée ajoutée ici semblait publiée alors
 * qu'elle n'apparaissait nulle part.
 */
export const entrepriseNav: NavItem[] = [
  { label: "Dashboard", href: "/espace-entreprise", icon: "dashboard" },
  { label: "Profil entreprise", href: "/espace-entreprise/profil", icon: "business" },
  { label: "Publier une offre", href: "/espace-entreprise/publier", icon: "add_box" },
  { label: "Mes offres", href: "/espace-entreprise/offres", icon: "work" },
  { label: "Candidatures", href: "/espace-entreprise/candidatures", icon: "inbox" },
  { label: "Profils jeunes", href: "/espace-entreprise/talents", icon: "groups" },
  { label: "Calendrier", href: "/espace-entreprise/calendrier", icon: "calendar_month" },
  { label: "Entretiens", href: "/espace-entreprise/entretiens", icon: "event" },
  { label: "Paramètres", href: "/espace-entreprise/parametres", icon: "settings" },
];

export const adminNav: NavEntry[] = [
  { label: "Dashboard", href: "/admin", icon: "dashboard" },
  { label: "Jeunes", href: "/admin/jeunes", icon: "school" },
  { label: "Entreprises", href: "/admin/entreprises", icon: "business" },
  { label: "Offres", href: "/admin/offres", icon: "work" },
  { label: "Formations", href: "/admin/formations", icon: "menu_book" },
  // « Test des comptes » et non « Test » tout court : le catalogue a lui aussi
  // un test par formation, et deux entrées homonymes ne se distingueraient pas.
  { label: "Test des comptes", href: "/admin/quiz", icon: "quiz" },
  { label: "Entretiens", href: "/admin/entretiens", icon: "event" },
  { label: "Messages", href: "/admin/messages", icon: "mail" },
  // Voisine de « Messages » : les deux touchent à ce que le visiteur demande.
  // Une bonne FAQ fait baisser le second, c'est le même sujet vu de deux côtés.
  { label: "FAQ", href: "/admin/faq", icon: "help" },
  {
    // Groupe repliable : d'autres listes de valeurs viendront s'y ajouter
    // (filières, types d'opportunité…) sans allonger la barre latérale.
    label: "Référentiels",
    icon: "category",
    children: [
      {
        label: "Catégories de formation",
        href: "/admin/referentiels/categories-formation",
        icon: "menu_book",
      },
      { label: "Filières", href: "/admin/referentiels/filieres", icon: "school" },
    ],
  },
  { label: "Statistiques", href: "/admin/statistiques", icon: "bar_chart" },
  { label: "Paramètres", href: "/admin/parametres", icon: "settings" },
];
