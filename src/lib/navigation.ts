/** Navigation maps for each space. Pages (§12) are the source of truth here. */

export interface NavItem {
  label: string;
  href: string;
  icon: string; // Material Symbols name
}

export const publicNav: NavItem[] = [
  { label: "Pour les jeunes", href: "/jeunes", icon: "school" },
  { label: "Pour les entreprises", href: "/entreprises", icon: "business" },
  { label: "À propos", href: "/a-propos", icon: "info" },
  { label: "Contact", href: "/contact", icon: "mail" },
];

export const jeuneNav: NavItem[] = [
  { label: "Dashboard", href: "/espace-jeune", icon: "dashboard" },
  { label: "Mon profil", href: "/espace-jeune/profil", icon: "person" },
  { label: "Mes documents", href: "/espace-jeune/documents", icon: "description" },
  { label: "Mon test", href: "/espace-jeune/test", icon: "assignment" },
  { label: "Mes formations", href: "/espace-jeune/formations", icon: "school" },
  { label: "Offres", href: "/espace-jeune/offres", icon: "work" },
  { label: "Mes candidatures", href: "/espace-jeune/candidatures", icon: "send" },
  { label: "Mes entretiens", href: "/espace-jeune/entretiens", icon: "event" },
  { label: "Paramètres", href: "/espace-jeune/parametres", icon: "settings" },
];

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

export const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: "dashboard" },
  { label: "Jeunes", href: "/admin/jeunes", icon: "school" },
  { label: "Entreprises", href: "/admin/entreprises", icon: "business" },
  { label: "Offres", href: "/admin/offres", icon: "work" },
  { label: "Formations", href: "/admin/formations", icon: "menu_book" },
  { label: "Quiz", href: "/admin/quiz", icon: "quiz" },
  { label: "Entretiens", href: "/admin/entretiens", icon: "event" },
  { label: "Statistiques", href: "/admin/statistiques", icon: "bar_chart" },
  { label: "Paramètres", href: "/admin/parametres", icon: "settings" },
];
