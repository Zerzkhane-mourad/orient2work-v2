"use client";

import { useSession } from "@/features/auth/session-provider";
import { useEntreprise } from "@/features/entreprise/entreprise-store";
import { AccountSettings } from "@/features/settings/account-settings";

export default function ParametresEntreprisePage() {
  const { entreprise } = useEntreprise();
  const { user } = useSession();

  // L'email affiché est celui du COMPTE (connexion), pas le contact public du
  // responsable — ce dernier se modifie depuis la fiche entreprise.
  return (
    <AccountSettings
      name={entreprise.responsable || entreprise.nom}
      email={user?.email ?? entreprise.emailResponsable}
    />
  );
}
