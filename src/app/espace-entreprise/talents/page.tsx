import { PageHeader } from "@/components/ui";
import { TalentSearch } from "@/features/talents/talent-search";
import { talents } from "@/lib/mock-talents";

export default function TalentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Profils jeunes"
        subtitle="Recherchez parmi les talents validés par leur test de compétences."
      />
      <TalentSearch talents={talents} />
    </div>
  );
}
