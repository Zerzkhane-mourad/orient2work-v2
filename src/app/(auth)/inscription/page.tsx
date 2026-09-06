import type { Metadata } from "next";
import { Suspense } from "react";
import { RegisterForm } from "@/features/auth/register-form";

export const metadata: Metadata = {
  title: "Inscription",
  description:
    "Créez votre compte Orient2Work : jeune talent pour candidater et vous former, ou entreprise pour publier vos offres.",
};

export default function InscriptionPage() {
  return (
    // Le formulaire lit `?role=` : il doit être sous `Suspense`, faute de quoi
    // `useSearchParams` fait basculer toute la page en rendu dynamique.
    <Suspense fallback={<FormulaireSquelette />}>
      <RegisterForm />
    </Suspense>
  );
}

/**
 * Attente calquée sur le formulaire réel.
 *
 * Une ligne « Chargement… » faisait sauter la mise en page dès l'arrivée du
 * formulaire ; ces blocs occupent d'emblée la place qu'il prendra.
 */
function FormulaireSquelette() {
  return (
    <div className="animate-pulse space-y-6" aria-hidden>
      <div className="space-y-2">
        <div className="h-9 w-2/3 rounded-lg bg-surface-container" />
        <div className="h-5 w-1/2 rounded bg-surface-container" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="h-[68px] rounded-xl bg-surface-container" />
        <div className="h-[68px] rounded-xl bg-surface-container" />
      </div>
      <div className="space-y-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[46px] rounded-lg bg-surface-container" />
        ))}
      </div>
    </div>
  );
}
