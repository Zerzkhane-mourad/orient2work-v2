"use client";

/**
 * Confirmation d'adresse email.
 *
 * Deux usages sur la même page :
 *  • avec `?token=…` (lien reçu par mail) → confirmation automatique ;
 *  • sans token → formulaire de renvoi du lien.
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button, Card, CardBody, ErrorBanner, Icon, Input, LoadingState } from "@/components/ui";
import { api } from "@/lib/api";
import { ApiError, humanizeError } from "@/lib/api/errors";
import { useMutation } from "@/lib/api/use-api";
import { useSession } from "./session-provider";

type Phase = "idle" | "verifying" | "done" | "failed";

export function VerifyEmail() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { user, reload } = useSession();

  const [phase, setPhase] = useState<Phase>(token ? "verifying" : "idle");
  const [error, setError] = useState<ApiError | null>(null);

  // React 18 monte deux fois les effets en développement : sans ce garde, le
  // token à usage unique serait consommé par le premier appel et le second
  // afficherait un échec.
  const attempted = useRef(false);

  useEffect(() => {
    if (!token || attempted.current) return;
    attempted.current = true;

    api.auth
      .verifyEmail(token)
      .then(() => {
        setPhase("done");
        // Rafraîchit `emailVerified` si l'utilisateur est déjà connecté.
        void reload();
      })
      .catch((caught: unknown) => {
        setError(
          caught instanceof ApiError
            ? caught
            : new ApiError(0, "INTERNAL_ERROR", "Vérification impossible."),
        );
        setPhase("failed");
      });
  }, [token, reload]);

  if (phase === "verifying") {
    return <LoadingState label="Confirmation de votre adresse…" />;
  }

  if (phase === "done") {
    return (
      <Card>
        <CardBody className="flex flex-col items-center gap-4 py-8 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success-container text-success">
            <Icon name="verified" filled className="text-2xl" />
          </span>
          <div>
            <h1 className="font-headline text-2xl font-bold text-primary">Adresse confirmée</h1>
            <p className="mt-2 text-sm text-on-surface-variant">
              Votre compte est activé. Vous pouvez maintenant vous connecter.
            </p>
          </div>
          <Link
            href={user ? "/espace-jeune" : "/connexion"}
            className="inline-flex items-center rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-on-primary"
          >
            {user ? "Aller à mon espace" : "Se connecter"}
          </Link>
        </CardBody>
      </Card>
    );
  }

  return <ResendVerification initialError={phase === "failed" ? error : null} />;
}

function ResendVerification({ initialError }: { initialError: ApiError | null }) {
  const { user } = useSession();
  const [email, setEmail] = useState(user?.email ?? "");
  const [sent, setSent] = useState(false);
  const { run, pending, error } = useMutation(api.auth.resendVerification);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = await run(email);
    if (result) setSent(true);
  };

  return (
    <Card>
      <CardBody className="space-y-5 py-8">
        <div className="text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
            <Icon name="mail" className="text-2xl" />
          </span>
          <h1 className="mt-4 font-headline text-2xl font-bold text-primary">
            {initialError ? "Lien expiré ou déjà utilisé" : "Confirmer votre adresse"}
          </h1>
          <p className="mt-2 text-sm text-on-surface-variant">
            {initialError
              ? humanizeError(initialError)
              : "Renseignez votre adresse pour recevoir un nouveau lien de confirmation."}
          </p>
        </div>

        {sent ? (
          <p className="rounded-lg bg-success-container px-4 py-3 text-center text-sm font-medium text-success">
            Si un compte existe et n&apos;est pas encore confirmé, un email vient d&apos;être
            envoyé.
          </p>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            {error && <ErrorBanner error={error} />}
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="vous@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button type="submit" fullWidth disabled={pending}>
              {pending ? "Envoi…" : "Renvoyer le lien"}
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-on-surface-variant">
          <Link href="/connexion" className="font-semibold text-primary hover:underline">
            Retour à la connexion
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
