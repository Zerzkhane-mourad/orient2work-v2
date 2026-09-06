import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState } from "@/components/ui";
import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = {
  title: "Connexion",
};

export default function ConnexionPage() {
  // `useSearchParams` (paramètre `suite`) impose une frontière Suspense.
  return (
    <Suspense fallback={<LoadingState />}>
      <LoginForm />
    </Suspense>
  );
}
