"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  ErrorBanner,
  Icon,
  Input,
  PageHeader,
  SuccessBanner,
} from "@/components/ui";
import { PasswordField, isPasswordValid } from "@/features/auth/password-field";
import { useSession } from "@/features/auth/session-provider";
import { api } from "@/lib/api";
import { LOGIN_PATH } from "@/lib/config";
import { useMutation } from "@/lib/api/use-api";

interface AccountSettingsProps {
  /** Nom affiché, fourni par l'espace appelant (profil jeune ou entreprise). */
  name: string;
  email: string;
  /** Formulaire d'identité propre à l'espace (le profil se modifie ailleurs). */
  children?: React.ReactNode;
}

/** Paramètres de compte partagés : identité, sécurité, sessions. */
export function AccountSettings({ name, email, children }: AccountSettingsProps) {
  return (
    <div className="space-y-6">
      <PageHeader title="Paramètres" subtitle="Gérez votre compte et votre sécurité." />

      <Card>
        <CardHeader>
          <CardTitle>Informations du compte</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-5 sm:grid-cols-2">
          <Input label="Nom" value={name} readOnly disabled />
          <Input
            label="Email"
            type="email"
            value={email}
            readOnly
            disabled
            hint="L'adresse de connexion n'est pas modifiable."
          />
          {children}
        </CardBody>
      </Card>

      <ChangePasswordCard />
      <SessionsCard />
    </div>
  );
}

function ChangePasswordCard() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);

  const { run, pending, error } = useMutation(api.auth.changePassword);

  const canSubmit =
    currentPassword.length > 0 &&
    isPasswordValid(newPassword) &&
    newPassword === confirm &&
    newPassword !== currentPassword;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    const result = await run(currentPassword, newPassword);
    if (!result) return;

    // Le backend révoque toutes les sessions : rester sur place afficherait une
    // interface qui ne peut plus rien charger.
    setDone(true);
    setTimeout(() => router.replace(LOGIN_PATH), 2500);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sécurité</CardTitle>
      </CardHeader>
      <CardBody>
        {done ? (
          <SuccessBanner message="Mot de passe modifié. Toutes vos sessions ont été fermées — redirection vers la connexion…" />
        ) : (
          <form className="grid gap-5 sm:grid-cols-2" onSubmit={handleSubmit} noValidate>
            {error && (
              <div className="sm:col-span-2">
                <ErrorBanner error={error} />
              </div>
            )}
            <Input
              label="Mot de passe actuel"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              error={error?.issueFor("currentPassword")}
              required
            />
            <div className="hidden sm:block" />
            <PasswordField
              label="Nouveau mot de passe"
              value={newPassword}
              onChange={setNewPassword}
              error={error?.issueFor("newPassword")}
            />
            <Input
              label="Confirmer"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              error={
                confirm.length > 0 && confirm !== newPassword
                  ? "Les mots de passe ne correspondent pas."
                  : undefined
              }
              required
            />
            <div className="sm:col-span-2">
              <Button type="submit" variant="outline" disabled={pending || !canSubmit}>
                {pending ? "Mise à jour…" : "Mettre à jour le mot de passe"}
              </Button>
              <p className="mt-2 text-xs text-on-surface-variant">
                Par sécurité, toutes vos sessions seront fermées.
              </p>
            </div>
          </form>
        )}
      </CardBody>
    </Card>
  );
}

function SessionsCard() {
  const { logout } = useSession();
  const router = useRouter();
  const { run, pending, error } = useMutation(api.auth.logoutAll);

  return (
    <Card className="border-error-container">
      <CardHeader>
        <CardTitle>Sessions actives</CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        {error && <ErrorBanner error={error} />}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 font-semibold text-on-surface">
              <Icon name="logout" className="text-[18px]" /> Déconnecter tous les appareils
            </p>
            <p className="text-sm text-on-surface-variant">
              Utile si vous vous êtes connecté sur un ordinateur partagé.
            </p>
          </div>
          <Button
            variant="danger"
            disabled={pending}
            onClick={() => {
              void run().then(async () => {
                await logout();
                router.replace(LOGIN_PATH);
              });
            }}
          >
            {pending ? "Fermeture…" : "Tout déconnecter"}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
