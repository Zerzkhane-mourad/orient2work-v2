"use client";

import { AccountSettings } from "@/features/settings/account-settings";
import { useProfile } from "@/features/jeune/profil/profile-store";

export default function ParametresJeunePage() {
  const { jeune } = useProfile();
  return <AccountSettings name={`${jeune.prenom} ${jeune.nom}`} email={jeune.email} />;
}
