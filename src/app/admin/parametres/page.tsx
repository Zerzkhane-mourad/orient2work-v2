"use client";

import { AccountSettings } from "@/features/settings/account-settings";
import { useSession } from "@/features/auth/session-provider";

/**
 * Paramètres du compte administrateur.
 *
 * L'adresse vient de la SESSION et non d'une constante : la page affichait
 * « admin@orient2work.ma » à qui que ce soit de connecté, y compris à un second
 * administrateur qui ne s'y reconnaissait pas. Le nom, lui, reste un libellé
 * d'équipe — un compte administrateur n'a pas de fiche de profil (`profileId`
 * vaut `null`), donc aucun nom à lire.
 */
export default function ParametresAdminPage() {
  const { user } = useSession();

  return <AccountSettings name="Équipe OMB" email={user?.email ?? "—"} />;
}
