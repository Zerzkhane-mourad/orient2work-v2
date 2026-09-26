import { AdminShell } from "@/features/admin/admin-shell";
import { RequireRole } from "@/features/auth/require-role";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole roles={["ADMIN"]}>
      <AdminShell>{children}</AdminShell>
    </RequireRole>
  );
}
