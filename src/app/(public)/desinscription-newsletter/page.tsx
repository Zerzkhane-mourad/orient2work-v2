import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState } from "@/components/ui";
import { UnsubscribeNewsletter } from "@/features/contact/unsubscribe";

export const metadata: Metadata = {
  title: "Désinscription newsletter",
};

export default function DesinscriptionNewsletterPage() {
  return (
    // Même lavis remonté sous l'en-tête que les autres pages publiques ; la
    // hauteur minimale empêche le pied de page de remonter sous une carte seule.
    <section className="-mt-20 flex min-h-[80vh] items-center bg-surface-container-low pb-24 pt-40">
      <div className="mx-auto w-full max-w-lg px-margin-mobile">
        <Suspense fallback={<LoadingState />}>
          <UnsubscribeNewsletter />
        </Suspense>
      </div>
    </section>
  );
}
