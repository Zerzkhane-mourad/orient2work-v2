import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/features/auth/password-reset-forms";

export const metadata: Metadata = {
  title: "Mot de passe oublié",
};

export default function MotDePasseOubliePage() {
  return <ForgotPasswordForm />;
}
