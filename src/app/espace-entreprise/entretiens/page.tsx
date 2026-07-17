import { EmptyState, PageHeader, Stat } from "@/components/ui";
import { EntretienCard } from "@/features/entretiens/entretien-card";
import { entretiens } from "@/lib/mock-data";

export default function GestionEntretiensPage() {
  const demandes = entretiens.filter((e) => e.status === "en_attente");
  const confirmes = entretiens.filter((e) => e.status === "accepte");

  return (
    <div className="space-y-8">
      <PageHeader title="Entretiens" subtitle="Gérez les demandes et suivez vos entretiens programmés." />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Demandes en attente" value={demandes.length} icon="schedule" />
        <Stat label="Confirmés" value={confirmes.length} icon="event_available" />
        <Stat label="Cette semaine" value={confirmes.length} icon="calendar_month" />
      </div>

      <section className="space-y-3">
        <h2 className="font-headline text-lg font-bold text-primary">Demandes à traiter</h2>
        {demandes.length > 0 ? (
          demandes.map((e) => <EntretienCard key={e.id} entretien={e} viewer="entreprise" />)
        ) : (
          <EmptyState icon="inbox" title="Aucune demande en attente" />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-headline text-lg font-bold text-primary">Entretiens confirmés</h2>
        {confirmes.length > 0 ? (
          confirmes.map((e) => <EntretienCard key={e.id} entretien={e} viewer="entreprise" />)
        ) : (
          <EmptyState icon="event_busy" title="Aucun entretien confirmé" />
        )}
      </section>
    </div>
  );
}
