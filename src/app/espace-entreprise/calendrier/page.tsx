import { Button, PageHeader } from "@/components/ui";
import { AvailabilityCalendar } from "@/features/entretiens/availability-calendar";

export default function CalendrierPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendrier"
        subtitle="Définissez vos créneaux disponibles pour les entretiens."
        actions={<Button variant="secondary">Enregistrer</Button>}
      />
      <AvailabilityCalendar />
    </div>
  );
}
