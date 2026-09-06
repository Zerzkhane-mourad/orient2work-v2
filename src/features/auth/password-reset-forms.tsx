"use client";

/** Parcours « mot de passe oublié » puis « nouveau mot de passe ». */
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, ErrorBanner, Icon, Input, SuccessBanner } from "@/components/ui";
import { api } from "@/lib/api";
import { useMutation } from "@/lib/api/use-api";
import { PasswordField, isPasswordValid } from "./password-field";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const { run, pending, error } = useMutation(api.auth.forgotPassword);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = await run(email);
    if (result) setSent(true);
  };

  return (
    <div>
      <h1 className="font-headline text-3xl font-bold text-primary">Mot de passe oublié</h1>
      <p className="mt-2 text-on-surface-variant">
        Indiquez votre adresse : nous vous enverrons un lien de réinitialisation.
      </p>

      {sent ? (
        <div className="mt-8 space-y-4">
          {/* Message volontairement neutre : l'API répond la même chose que le
              compte existe ou non, pour ne pas permettre d'énumérer les comptes. */}
          <SuccessBanner message="Si un compte existe pour cette adresse, un email vient d'être envoyé. Le lien est valable 15 minutes." />
          <Link
            href="/connexion"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            <Icon name="arrow_back" className="text-[16px]" /> Retour à la connexion
          </Link>
        </div>
      ) : (
        <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
          {error && <ErrorBanner error={error} />}
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="vous@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={error?.issueFor("email")}
            required
          />
          <Button type="submit" size="lg" fullWidth disabled={pending}>
            {pending ? "Envoi…" : "Envoyer le lien"}
          </Button>
          <p className="text-center text-sm text-on-surface-variant">
            <Link href="/connexion" className="font-semibold text-primary hover:underline">
              Retour à la connexion
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);

  const { run, pending, error } = useMutation(api.auth.resetPassword);

  const canSubmit = isPasswordValid(password) && password === confirm && token.length > 0;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    const result = await run(token, password);
    if (result) setDone(true);
  };

  if (!token) {
    return (
      <div className="space-y-4">
        <h1 className="font-headline text-3xl font-bold text-primary">Lien invalide</h1>
        <p className="text-on-surface-variant">
          Ce lien de réinitialisation est incomplet. Relancez la procédure depuis la page de
          connexion.
        </p>
        <Link
          href="/mot-de-passe-oublie"
          className="inline-flex font-semibold text-primary hover:underline"
        >
          Demander un nouveau lien
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="space-y-5">
        <h1 className="font-headline text-3xl font-bold text-primary">Mot de passe modifié</h1>
        {/* Le backend révoque toutes les sessions existantes : c'est voulu, un
            reset doit expulser un éventuel attaquant déjà connecté. */}
        <SuccessBanner message="Vos autres sessions ont été fermées par sécurité. Connectez-vous avec votre nouveau mot de passe." />
        <Button size="lg" fullWidth onClick={() => router.replace("/connexion")}>
          Se connecter
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-headline text-3xl font-bold text-primary">Nouveau mot de passe</h1>
      <p className="mt-2 text-on-surface-variant">Choisissez un mot de passe robuste.</p>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
        {error && <ErrorBanner error={error} />}
        <PasswordField
          label="Nouveau mot de passe"
          value={password}
          onChange={setPassword}
          error={error?.issueFor("password")}
        />
        <Input
          label="Confirmer"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={
            confirm.length > 0 && confirm !== password
              ? "Les mots de passe ne correspondent pas."
              : undefined
          }
          required
        />
        <Button type="submit" size="lg" fullWidth disabled={pending || !canSubmit}>
          {pending ? "Enregistrement…" : "Définir le mot de passe"}
        </Button>
      </form>
    </div>
  );
}
