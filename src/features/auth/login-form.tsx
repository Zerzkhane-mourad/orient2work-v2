"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, ErrorBanner, Input } from "@/components/ui";
import { HOME_BY_ROLE } from "@/lib/config";
import { useMutation } from "@/lib/api/use-api";
import { useSession } from "./session-provider";

/** Formulaire de connexion (§5.2 & §6.2). */
export function LoginForm() {
  const { login } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { run, pending, error } = useMutation(login);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const user = await run(email, password);
    if (!user) return; // L'erreur est déjà affichée par le bandeau.

    // `suite` est posé par le client API quand une session expire en cours de
    // navigation : on ramène l'utilisateur là où il en était.
    const suite = searchParams.get("suite");
    router.replace(suite && suite.startsWith("/") ? suite : HOME_BY_ROLE[user.role]);
    // Rafraîchit les Server Components (en-têtes, pages publiques) avec la
    // nouvelle session.
    router.refresh();
  };

  return (
    <div>
      <h1 className="font-headline text-3xl font-bold text-primary">Bon retour 👋</h1>
      <p className="mt-2 text-on-surface-variant">Connectez-vous pour accéder à votre espace.</p>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
        {error && <ErrorBanner error={error} />}

        <Input
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="vous@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          label="Mot de passe"
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <div className="flex items-center justify-end text-sm">
          <Link
            href="/mot-de-passe-oublie"
            className="font-semibold text-secondary hover:underline"
          >
            Mot de passe oublié ?
          </Link>
        </div>

        <Button type="submit" size="lg" fullWidth disabled={pending}>
          {pending ? "Connexion…" : "Se connecter"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-on-surface-variant">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="font-semibold text-primary hover:underline">
          S&apos;inscrire
        </Link>
      </p>
    </div>
  );
}
