/**
 * Catalogue des permissions d'administration.
 *
 * ── Pourquoi le catalogue est dans le CODE et pas en base ────────────────────
 *
 * Une permission n'est pas une étiquette : c'est le nom d'un garde réellement
 * posé sur une route (`requirePermission("roles:write")`). Si le back-office
 * permettait d'en inventer une — « facturation:write » —, elle apparaîtrait
 * comme une case à cocher qui ne protège rien. Un contrôle d'accès qui ment est
 * pire que pas de contrôle du tout.
 *
 * La base ne stocke donc QUE l'association rôle → codes, et tout code absent de
 * ce fichier est rejeté en 422 à l'écriture. Ajouter une permission est un acte
 * de développement : on l'ajoute ici ET on pose le garde correspondant.
 *
 * ── Deux lectures portent sur un PRIVILÈGE, pas sur un écran ────────────────
 *
 * `formations:read` et `entretiens:read` gouvernent des routes ouvertes à
 * d'autres publics, où l'administrateur voit simplement PLUS. Elles sont donc
 * appliquées dans le service, sur la seule branche administrateur :
 *
 *  • `formations:read` — `GET /formations` est public ; l'admin y voit en plus
 *    les BROUILLONS. Sans la permission, il voit le catalogue comme un visiteur.
 *    On dégrade plutôt que de refuser : renvoyer 403 sur une page publique
 *    n'aurait aucun sens.
 *  • `entretiens:read` — `GET /entretiens` filtre par périmètre d'appelant ;
 *    l'admin, lui, les voit TOUS. Sans la permission, la branche administrateur
 *    est refusée — elle n'a pas de repli naturel, un admin n'ayant pas de
 *    périmètre propre.
 *
 * ── Convention de nommage ───────────────────────────────────────────────────
 *
 * `<ressource>:<action>` avec `read` (consulter) et `write` (créer, modifier,
 * supprimer). Deux actions et pas quatre : distinguer `create` de `update` et de
 * `delete` multiplierait les cases à cocher sans qu'aucun écran du back-office
 * ne propose l'une sans les autres.
 */

interface PermissionDef {
  readonly code: string;
  /** Formulation à la première personne du pluriel, telle qu'affichée dans la matrice. */
  readonly libelle: string;
}

interface PermissionGroupDef {
  readonly cle: string;
  readonly libelle: string;
  readonly description: string;
  readonly permissions: readonly PermissionDef[];
}

/**
 * Regroupement par domaine — l'ordre est celui de la matrice du back-office.
 *
 * `as const` : le type `Permission` en est DÉRIVÉ, si bien qu'une faute de
 * frappe dans un `requirePermission("jeune:write")` ne compile pas.
 */
export const PERMISSION_GROUPS = [
  {
    cle: "pilotage",
    libelle: "Pilotage",
    description: "Chiffres consolidés de la plateforme.",
    permissions: [
      { code: "statistiques:read", libelle: "Consulter les statistiques" },
    ],
  },
  {
    cle: "comptes",
    libelle: "Comptes des membres",
    description: "Validation et suspension des jeunes et des entreprises.",
    permissions: [
      { code: "jeunes:read", libelle: "Consulter les profils jeunes" },
      { code: "jeunes:write", libelle: "Modifier le statut d'un jeune" },
      { code: "entreprises:read", libelle: "Consulter les entreprises" },
      { code: "entreprises:write", libelle: "Valider, refuser ou suspendre une entreprise" },
    ],
  },
  {
    cle: "contenus",
    libelle: "Contenus",
    description: "Offres, catalogue de formations, tests de validation et FAQ.",
    permissions: [
      { code: "offres:read", libelle: "Consulter la file de modération des offres" },
      { code: "offres:write", libelle: "Modérer les offres" },
      { code: "formations:read", libelle: "Consulter les formations, brouillons compris" },
      { code: "formations:write", libelle: "Créer et modifier les formations" },
      { code: "tests:read", libelle: "Consulter les tests de validation" },
      { code: "tests:write", libelle: "Modifier les tests de validation" },
      { code: "faq:read", libelle: "Consulter la FAQ, masquées comprises" },
      { code: "faq:write", libelle: "Modifier la FAQ" },
    ],
  },
  {
    cle: "relation",
    libelle: "Relation et suivi",
    description:
      "Entretiens de toute la plateforme, messages du formulaire de contact et abonnés à la newsletter.",
    permissions: [
      { code: "entretiens:read", libelle: "Consulter les entretiens de toute la plateforme" },
      { code: "messages:read", libelle: "Lire les messages reçus" },
      { code: "messages:write", libelle: "Marquer un message comme traité" },
    ],
  },
  {
    cle: "configuration",
    libelle: "Configuration",
    description: "Listes de valeurs utilisées par toute la plateforme.",
    permissions: [
      { code: "referentiels:read", libelle: "Consulter les référentiels" },
      { code: "referentiels:write", libelle: "Modifier les référentiels" },
    ],
  },
  {
    cle: "administration",
    libelle: "Administration",
    description:
      "Gouvernance du back-office lui-même. « Gérer les rôles » permet de s'octroyer n'importe quelle autre permission : à réserver aux responsables.",
    permissions: [
      { code: "utilisateurs:read", libelle: "Consulter les comptes d'administration" },
      { code: "utilisateurs:write", libelle: "Créer et gérer les comptes d'administration" },
      { code: "roles:read", libelle: "Consulter les rôles" },
      { code: "roles:write", libelle: "Créer et modifier les rôles" },
    ],
  },
] as const satisfies readonly PermissionGroupDef[];

/** Union fermée des codes du catalogue. */
export type Permission = (typeof PERMISSION_GROUPS)[number]["permissions"][number]["code"];

export const ALL_PERMISSIONS: readonly Permission[] = PERMISSION_GROUPS.flatMap((groupe) =>
  groupe.permissions.map((permission) => permission.code),
);

const CODES = new Set<string>(ALL_PERMISSIONS);

/** Garde de type : filtre ce qui vient de la base ou du client. */
export function isPermission(value: string): value is Permission {
  return CODES.has(value);
}

/**
 * Permissions effectives d'un rôle.
 *
 * Un rôle SYSTÈME reçoit le catalogue entier, calculé à la lecture plutôt que
 * recopié en base. Sans cela, chaque permission ajoutée au code devrait être
 * propagée par migration au rôle « Super administrateur », et l'oublier
 * priverait silencieusement les responsables d'un écran qu'ils venaient
 * d'obtenir.
 */
export function effectivePermissions(role: {
  systeme: boolean;
  permissions: string[];
}): Permission[] {
  if (role.systeme) return [...ALL_PERMISSIONS];
  return role.permissions.filter(isPermission);
}
