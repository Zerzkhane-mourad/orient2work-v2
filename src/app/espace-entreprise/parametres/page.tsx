import { AccountSettings } from "@/features/settings/account-settings";
import { currentEntreprise } from "@/lib/mock-data";

export default function ParametresEntreprisePage() {
  return <AccountSettings name={currentEntreprise.responsable} email={currentEntreprise.emailResponsable} />;
}
