import { RoleEditor } from "@/features/admin/role-editor";
import { RequirePermission } from "@/features/auth/require-permission";

export default function NouveauRolePage() {
  return (
    <RequirePermission requires="roles:write" retour="/admin/roles" retourLabel="Retour aux rôles">
      <RoleEditor />
    </RequirePermission>
  );
}
