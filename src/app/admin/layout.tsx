import { AppShell } from "@/components/layout/app-shell";
import { RequireRole } from "@/features/auth/require-role";
import { adminNav } from "@/lib/navigation";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole roles={["ADMIN"]}>
      <AppShell
        nav={adminNav}
        homeHref="/admin"
        roleLabel="Administration OMB"
        user={{ name: "Équipe OMB", role: "Administrateur" }}
      >
        {children}
      </AppShell>
    </RequireRole>
  );
}
