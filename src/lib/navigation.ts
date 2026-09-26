import type { IconName } from "@/components/ui/icon";
import type { Permission } from "@/lib/api/types";
/** Navigation maps for each space. Pages (§12) are the source of truth here. */

export interface NavItem {
  label: string;
  href: string;
  icon: IconName;
  /**
   * Permissions donnant accès à l'écran — l'entrée s'affiche dès que l'une
   * d'elles est détenue (voir `filterNav`).
   *
   * Plusieurs codes pour un même écran parce qu'un écran de liste se CONSULTE
   * avec `…:read` et s'ÉDITE avec `…:write` : celui qui ne peut que lire doit
   * quand même voir l'entrée. Absente = visible par tout administrateur.
   */
  permissions?: Permission[];
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

/**
 * Navigation du back-office.
 *
 * Chaque entrée déclare les permissions qui y donnent accès ; `filterNav` ne
 * garde que celles que l'administrateur connecté peut réellement ouvrir. Les
 * codes doivent correspondre aux gardes posés sur les routes
 * (`backend/src/routes/admin.routes.ts`) — une entrée annoncée sans garde
 * derrière mènerait à un écran d'erreur.
 *
 * « Dashboard » et « Paramètres » restent sans permission, délibérément : le
 * premier est la page d'arrivée du rôle ADMIN — la masquer laisserait
 * l'administrateur sans destination après connexion —, le second ne porte que
 * des préférences personnelles.
 */
export const adminNav: NavEntry[] = [
  { label: "Dashboard", href: "/admin", icon: "dashboard" },
  {
    label: "Jeunes",
    href: "/admin/jeunes",
    icon: "school",
    permissions: ["jeunes:read", "jeunes:write"],
  },
  {
    label: "Entreprises",
    href: "/admin/entreprises",
    icon: "business",
    permissions: ["entreprises:read", "entreprises:write"],
  },
  {
    label: "Offres",
    href: "/admin/offres",
    icon: "work",
    permissions: ["offres:read", "offres:write"],
  },
  {
    label: "Formations",
    href: "/admin/formations",
    icon: "menu_book",
    permissions: ["formations:read", "formations:write"],
  },
  // « Test des comptes » et non « Test » tout court : le catalogue a lui aussi
  // un test par formation, et deux entrées homonymes ne se distingueraient pas.
  {
    label: "Test des comptes",
    href: "/admin/quiz",
    icon: "quiz",
    permissions: ["tests:read", "tests:write"],
  },
  {
    label: "Entretiens",
    href: "/admin/entretiens",
    icon: "event",
    permissions: ["entretiens:read"],
  },
  {
    label: "Messages",
    href: "/admin/messages",
    icon: "mail",
    permissions: ["messages:read", "messages:write"],
  },
  // Voisine de « Messages » : les deux touchent à ce que le visiteur demande.
  // Une bonne FAQ fait baisser le second, c'est le même sujet vu de deux côtés.
  { label: "FAQ", href: "/admin/faq", icon: "help", permissions: ["faq:read", "faq:write"] },
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
        permissions: ["referentiels:read", "referentiels:write"],
      },
      {
        label: "Filières",
        href: "/admin/referentiels/filieres",
        icon: "school",
        permissions: ["referentiels:read", "referentiels:write"],
      },
    ],
  },
  {
    // Groupé plutôt que posé à plat : ces deux écrans ne gouvernent pas la
    // plateforme mais le back-office lui-même, et se lisent ensemble — un
    // compte n'a de droits que par le rôle qu'on lui attribue.
    label: "Accès",
    icon: "lock",
    children: [
      {
        label: "Utilisateurs",
        href: "/admin/utilisateurs",
        icon: "badge",
        permissions: ["utilisateurs:read", "utilisateurs:write"],
      },
      {
        label: "Rôles et permissions",
        href: "/admin/roles",
        icon: "verified_user",
        permissions: ["roles:read", "roles:write"],
      },
    ],
  },
  {
    label: "Statistiques",
    href: "/admin/statistiques",
    icon: "bar_chart",
    permissions: ["statistiques:read"],
  },
  { label: "Paramètres", href: "/admin/parametres", icon: "settings" },
];

/**
 * Ne garde que les entrées ouvrables par l'utilisateur courant.
 *
 * Un groupe dont tous les enfants sont masqués disparaît : le laisser afficherait
 * une rubrique qui se déplie sur rien.
 *
 * `canAny` est injecté plutôt qu'importé — ce module est du data pur, lisible
 * depuis un composant serveur comme depuis un composant client.
 */
export function filterNav(
  entries: NavEntry[],
  canAny: (...permissions: Permission[]) => boolean,
): NavEntry[] {
  return entries.reduce<NavEntry[]>((visibles, entry) => {
    if (!isNavGroup(entry)) {
      if (canAny(...(entry.permissions ?? []))) visibles.push(entry);
      return visibles;
    }

    const children = entry.children.filter((child) => canAny(...(child.permissions ?? [])));
    if (children.length > 0) visibles.push({ ...entry, children });
    return visibles;
  }, []);
}
