import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState } from "@/components/ui";
import { ResetPasswordForm } from "@/features/auth/password-reset-forms";

export const metadata: Metadata = {
  title: "Réinitialisation du mot de passe",
};

export default function ReinitialisationMotDePassePage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
