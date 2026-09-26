import { FormationEditor } from "@/features/admin/formation-editor";
import { RequirePermission } from "@/features/auth/require-permission";

export default function NouvelleFormationPage() {
  return (
    <RequirePermission
      requires="formations:write"
      retour="/admin/formations"
      retourLabel="Retour au catalogue"
    >
      <FormationEditor />
    </RequirePermission>
  );
}
