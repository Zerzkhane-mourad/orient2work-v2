"use client";

/**
 * Désinscription de la newsletter.
 *
 * Le jeton vient du lien reçu par email : c'est ce qui empêche de désinscrire
 * quelqu'un d'autre en connaissant seulement son adresse.
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardBody, Icon, LoadingState } from "@/components/ui";
import { api } from "@/lib/api";
import { ApiError, humanizeError } from "@/lib/api/errors";

type Phase = "working" | "done" | "failed" | "missing";

export function UnsubscribeNewsletter() {
  const token = useSearchParams().get("token");
  const [phase, setPhase] = useState<Phase>(token ? "working" : "missing");
  const [error, setError] = useState<ApiError | null>(null);

  // React monte deux fois les effets en développement : sans ce garde, le
  // second appel afficherait un échec sur un jeton déjà consommé.
  const attempted = useRef(false);

  useEffect(() => {
    if (!token || attempted.current) return;
    attempted.current = true;

    api.contact
      .unsubscribe(token)
      .then(() => setPhase("done"))
      .catch((caught: unknown) => {
        setError(
          caught instanceof ApiError
            ? caught
            : new ApiError(0, "INTERNAL_ERROR", "Désinscription impossible."),
        );
        setPhase("failed");
      });
  }, [token]);

  if (phase === "working") return <LoadingState label="Désinscription en cours…" />;

  const success = phase === "done";

  return (
    <Card>
      <CardBody className="flex flex-col items-center gap-4 py-10 text-center">
        <span
          className={
            success
              ? "flex h-14 w-14 items-center justify-center rounded-full bg-success-container text-success"
              : "flex h-14 w-14 items-center justify-center rounded-full bg-error-container text-on-error-container"
          }
        >
          <Icon name={success ? "check_circle" : "error"} filled className="text-2xl" />
        </span>

        <div>
          <h1 className="font-headline text-2xl font-bold text-primary">
            {success ? "Désinscription confirmée" : "Lien invalide"}
          </h1>
          <p className="mt-2 text-sm text-on-surface-variant">
            {success
              ? "Vous ne recevrez plus notre newsletter. Vous pouvez vous réinscrire à tout moment."
              : phase === "missing"
                ? "Ce lien de désinscription est incomplet. Utilisez celui reçu dans votre email."
                : humanizeError(error)}
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex items-center rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-on-primary"
        >
          Retour à l&apos;accueil
        </Link>
      </CardBody>
    </Card>
  );
}
