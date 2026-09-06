"use client";

/**
 * Protection des routes privées.
 *
 * Garde-fou d'expérience utilisateur, PAS de sécurité : la vraie autorisation
 * est faite par le backend sur chaque requête (RBAC + vérification de
 * propriété). Ce composant évite simplement d'afficher une coquille vide à qui
 * n'a rien à y faire.
 */
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ButtonLink, Card, CardBody, Icon, LoadingState } from "@/components/ui";
import { HOME_BY_ROLE, LOGIN_PATH } from "@/lib/config";
import type { Role } from "@/lib/api/types";
import { useSession } from "./session-provider";

const ROLE_LABELS: Record<Role, string> = {
  JEUNE: "Espace Jeune",
  ENTREPRISE: "Espace Entreprise",
  ADMIN: "Administration OMB",
};

export function RequireRole({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  const { user, loading } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const allowed = user !== null && roles.includes(user.role);

  useEffect(() => {
    if (loading || user) return;
    // `suite` permet de revenir sur la page demandée après connexion.
    router.replace(`${LOGIN_PATH}?suite=${encodeURIComponent(pathname)}`);
  }, [loading, user, pathname, router]);

  if (loading) {
    return <LoadingState label="Vérification de votre session…" />;
  }

  if (!user) {
    return <LoadingState label="Redirection vers la connexion…" />;
  }

  if (!allowed) {
    // Connecté mais au mauvais endroit : on ne redirige pas en silence, on
    // explique et on propose le bon espace.
    return (
      <div className="mx-auto max-w-lg py-16">
        <Card>
          <CardBody className="flex flex-col items-center gap-4 py-10 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-error-container text-on-error-container">
              <Icon name="lock" className="text-2xl" />
            </span>
            <div>
              <h1 className="font-headline text-xl font-bold text-primary">Accès refusé</h1>
              <p className="mt-1 text-sm text-on-surface-variant">
                Cette section est réservée à {roles.map((r) => ROLE_LABELS[r]).join(" / ")}. Votre
                compte est rattaché à {ROLE_LABELS[user.role]}.
              </p>
            </div>
            <ButtonLink href={HOME_BY_ROLE[user.role]} variant="secondary">
              Aller à mon espace
            </ButtonLink>
          </CardBody>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Bandeau affiché quand l'email n'est pas encore confirmé.
 *
 * Le backend refuse certaines actions (candidater) tant que l'adresse n'est pas
 * vérifiée : mieux vaut prévenir en amont qu'échouer au clic.
 */
export function EmailVerificationBanner() {
  const { user } = useSession();
  if (!user || user.emailVerified) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg bg-secondary-container px-4 py-3 text-sm text-on-secondary-container">
      <Icon name="mail" className="text-[18px]" />
      <span className="flex-1">
        Confirmez votre adresse <strong>{user.email}</strong> pour pouvoir candidater aux offres.
      </span>
      <ButtonLink href="/verification-email" size="sm" variant="secondary">
        Renvoyer le lien
      </ButtonLink>
    </div>
  );
}
