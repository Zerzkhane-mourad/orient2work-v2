import type { Metadata } from "next";
import { Suspense } from "react";
import { RegisterForm } from "@/features/auth/register-form";

export const metadata: Metadata = {
  title: "Inscription",
};

export default function InscriptionPage() {
  return (
    <Suspense fallback={<p className="text-on-surface-variant">Chargement…</p>}>
      <RegisterForm />
    </Suspense>
  );
}
