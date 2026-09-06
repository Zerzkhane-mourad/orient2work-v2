import { Suspense } from "react";
import type { Metadata } from "next";
import { SectionHeading } from "@/components/marketing/section-heading";
import { SkeletonCard } from "@/components/ui";
import { OffresBrowser } from "@/features/offres/offres-browser";

export const metadata: Metadata = {
  title: "Offres d'emploi",
  description:
    "Consultez les offres de stage, emploi, PFE et alternance publiées par nos entreprises partenaires.",
};

export default function OffresPage() {
  return (
    <div className="mx-auto max-w-container-max px-margin-mobile py-16 lg:px-margin-desktop">
      <SectionHeading
        eyebrow="Opportunités"
        title="Offres d'emploi & de stage"
        subtitle="Stage, emploi, PFE, alternance, freelance ou projet : trouvez l'opportunité qui vous correspond."
        className="mb-10"
      />
      {/*
        Sans `detailBase`, les cartes ne sont pas cliquables : le détail d'une
        offre est réservé aux comptes jeunes.

        La frontière de suspense est exigée par la lecture de l'URL dans
        `OffresBrowser` : sans elle, cette page cesserait d'être prérendue.
      */}
      <Suspense
        fallback={
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        }
      >
        <OffresBrowser />
      </Suspense>
    </div>
  );
}
