"use client";

/**
 * Protection d'un écran ENTIER par une permission d'administration.
 *
 * Réservé aux pages qui n'existent que pour écrire — création, édition. Masquer
 * leurs boutons ne suffirait pas : l'écran lui-même n'a aucun sens sans le
 * droit, et on y arrive aussi par une URL directe ou un signet.
 *
 * Pour un écran de LISTE, dont la consultation reste légitime, on masque au
 * contraire les seules actions avec `useCan(...)` — retirer la page entière
 * priverait d'une lecture à laquelle le rôle a droit.
 *
 * Comme `RequireRole`, c'est un garde-fou d'expérience et PAS de sécurité : le
 * serveur refait le contrôle sur chaque requête, à partir de la base.
 */
import { ButtonLink, Card, CardBody, Icon, LoadingState } from "@/components/ui";
import type { Permission } from "@/lib/api/types";
import { useSession } from "./session-provider";
import { usePermissions } from "./use-permissions";

export function RequirePermission({
  requires,
  /** Où renvoyer l'utilisateur — la liste dont cet écran est le formulaire. */
  retour,
  retourLabel = "Retour",
  children,
}: {
  requires: Permission | Permission[];
  retour: string;
  retourLabel?: string;
  children: React.ReactNode;
}) {
  const { loading } = useSession();
  const { can } = usePermissions();
  const requises = Array.isArray(requires) ? requires : [requires];

  // Les permissions arrivent avec la session : sans cette attente, l'écran
  // afficherait « accès refusé » une fraction de seconde à chaque rechargement.
  if (loading) return <LoadingState label="Vérification de vos droits…" />;

  if (!can(...requises)) {
    return (
      <div className="mx-auto max-w-lg py-16">
        <Card>
          <CardBody className="flex flex-col items-center gap-4 py-10 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-error-container text-on-error-container">
              <Icon name="lock" className="text-2xl" />
            </span>
            <div>
              <h1 className="font-headline text-xl font-bold text-primary">Droits insuffisants</h1>
              <p className="mt-1 text-sm text-on-surface-variant">
                Cet écran demande {requises.length > 1 ? "les permissions" : "la permission"}{" "}
                {requises.map((permission) => (
                  <code key={permission} className="text-on-surface">
                    {permission}
                  </code>
                ))}
                . Demandez-{requises.length > 1 ? "les" : "la"} à un administrateur chargé des
                rôles.
              </p>
            </div>
            <ButtonLink href={retour} variant="secondary">
              {retourLabel}
            </ButtonLink>
          </CardBody>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
