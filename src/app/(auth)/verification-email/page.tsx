import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState } from "@/components/ui";
import { VerifyEmail } from "@/features/auth/verify-email";

export const metadata: Metadata = {
  title: "Confirmation d'adresse email",
};

export default function VerificationEmailPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <VerifyEmail />
    </Suspense>
  );
}
