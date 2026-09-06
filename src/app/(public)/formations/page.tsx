import { Suspense } from "react";
import type { Metadata } from "next";
import { SectionHeading } from "@/components/marketing/section-heading";
import { SkeletonCard } from "@/components/ui";
import { FormationsCatalog } from "@/features/formations/formations-catalog";

export const metadata: Metadata = {
  title: "Formations",
  description:
    "Des formations préenregistrées sur l'employabilité : CV, lettre de motivation, entretien, LinkedIn et plus.",
};

export default function FormationsPage() {
  return (
    <div className="mx-auto max-w-container-max px-margin-mobile py-16 lg:px-margin-desktop">
      <SectionHeading
        eyebrow="E-learning"
        title="Formations employabilité"
        subtitle="Préparez votre insertion professionnelle avec des formations certifiantes, accessibles après validation de votre profil."
        className="mb-10"
      />
      {/* Sans `detailBase`, les cartes renvoient vers l'inscription : le contenu
          des cours est réservé aux comptes jeunes. */}
      {/* Le catalogue lit l'URL (`?q=`) : sans frontière de suspense, cette
          page cesserait d'être prérendue. */}
      <Suspense fallback={<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>}>
        <FormationsCatalog />
      </Suspense>
    </div>
  );
}
