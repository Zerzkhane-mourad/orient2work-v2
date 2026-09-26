import { TestEditor } from "@/features/admin/test-editor";
import { RequirePermission } from "@/features/auth/require-permission";

export default function NouveauTestPage() {
  return (
    <RequirePermission
      requires="tests:write"
      retour="/admin/quiz"
      retourLabel="Retour aux tests"
    >
      <TestEditor />
    </RequirePermission>
  );
}
