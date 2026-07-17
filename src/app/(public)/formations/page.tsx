import type { Metadata } from "next";
import { SectionHeading } from "@/components/marketing/section-heading";
import { FormationsCatalog } from "@/features/formations/formations-catalog";
import { formations } from "@/lib/mock-data";

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
      <FormationsCatalog formations={formations} />
    </div>
  );
}
