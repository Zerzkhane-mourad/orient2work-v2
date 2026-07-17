import type { Metadata } from "next";
import { SectionHeading } from "@/components/marketing/section-heading";
import { OffresBrowser } from "@/features/offres/offres-browser";
import { offres } from "@/lib/mock-data";

export const metadata: Metadata = {
  title: "Offres d'emploi",
  description: "Consultez les offres de stage, emploi, PFE et alternance publiées par nos entreprises partenaires.",
};

export default function OffresPage() {
  const published = offres.filter((o) => o.status === "publiee");

  return (
    <div className="mx-auto max-w-container-max px-margin-mobile py-16 lg:px-margin-desktop">
      <SectionHeading
        eyebrow="Opportunités"
        title="Offres d'emploi & de stage"
        subtitle="Stage, emploi, PFE, alternance, freelance ou projet : trouvez l'opportunité qui vous correspond."
        className="mb-10"
      />
      <OffresBrowser offres={published} />
    </div>
  );
}
