"use client";

import { PageHeader } from "@/components/ui";
import { ValidationBanner } from "@/features/entreprise/validation-banner";
import { TalentSearch } from "@/features/talents/talent-search";

export default function TalentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Profils jeunes"
        subtitle="Recherchez parmi les talents validés par leur test de compétences."
      />
      {/* L'accès aux talents est réservé aux comptes validés par OMB : le
          bandeau explique en amont le 403 que renverrait l'API. */}
      <ValidationBanner />
      <TalentSearch />
    </div>
  );
}
