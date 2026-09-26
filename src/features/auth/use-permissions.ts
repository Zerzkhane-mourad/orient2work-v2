"use client";

/**
 * Permissions d'administration côté client.
 *
 * ── Garde-fou d'expérience, PAS de sécurité ─────────────────────────────────
 *
 * Masquer un bouton n'empêche personne d'appeler la route : l'autorisation
 * réelle est refaite par le serveur sur chaque requête, à partir de la base.
 * Ce module sert à ne pas proposer ce qui sera refusé — un menu dont la moitié
 * des entrées mènent à un écran d'erreur est un menu qu'on cesse de lire.
 *
 * La source est l'utilisateur de session, rafraîchi à chaque connexion et à
 * chaque `/auth/refresh`. Un droit retiré pendant qu'un administrateur est
 * connecté disparaît donc de son menu au rafraîchissement suivant — alors qu'il
 * lui est refusé par le serveur dès l'instant du retrait.
 */
import { useMemo } from "react";
import type { Permission } from "@/lib/api/types";
import { useSession } from "./session-provider";

export interface PermissionsState {
  /** `true` si TOUTES les permissions demandées sont détenues. */
  can: (...required: Permission[]) => boolean;
  /** `true` si AU MOINS UNE l'est — pour une rubrique qui regroupe plusieurs écrans. */
  canAny: (...required: Permission[]) => boolean;
  permissions: Permission[];
}

export function usePermissions(): PermissionsState {
  const { user } = useSession();

  return useMemo(() => {
    const granted = user?.permissions ?? [];
    return {
      permissions: granted,
      can: (...required) => required.every((permission) => granted.includes(permission)),
      // Sans permission demandée, il n'y a rien à refuser : l'entrée reste visible.
      canAny: (...required) =>
        required.length === 0 || required.some((permission) => granted.includes(permission)),
    };
  }, [user]);
}

/**
 * Raccourci pour le cas courant : « cet écran peut-il écrire ? ».
 *
 * C'est la forme qu'on veut lire en tête de composant —
 * `const peutEcrire = useCan("formations:write")` — plutôt que de déstructurer
 * `can` pour ne s'en servir qu'une fois. Les boutons d'action en dépendent
 * tous, autant que la condition porte un nom.
 */
export function useCan(...required: Permission[]): boolean {
  return usePermissions().can(...required);
}

/**
 * Masque ses enfants tant que la permission n'est pas détenue.
 *
 * Pour un bloc entier — une carte du tableau de bord, une colonne d'actions.
 * Pour un simple bouton, `useCan(...)` dans le composant reste plus lisible
 * qu'une enveloppe supplémentaire.
 */
export function PermissionGate({
  requires,
  children,
  fallback = null,
}: {
  requires: Permission | Permission[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}): React.ReactNode {
  const { can } = usePermissions();
  const required = Array.isArray(requires) ? requires : [requires];
  return can(...required) ? children : fallback;
}
