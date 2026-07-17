import { AccountSettings } from "@/features/settings/account-settings";
import { currentJeune } from "@/lib/mock-data";

export default function ParametresJeunePage() {
  return (
    <AccountSettings name={`${currentJeune.prenom} ${currentJeune.nom}`} email={currentJeune.email} />
  );
}
