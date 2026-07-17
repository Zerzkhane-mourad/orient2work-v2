import { ButtonLink, Card, CardBody, EmptyState, Icon } from "@/components/ui";
import { EntretienCard } from "@/features/entretiens/entretien-card";
import { entretiens } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";

const prepChecklist = [
  "Relire l'offre et le profil recherché",
  "Préparer 2 questions sur le poste",
  "Revoir vos projets et expériences clés",
  "Tester votre connexion et votre matériel",
];

export default function MesEntretiensPage() {
  const aVenir = entretiens.filter((e) => e.status === "accepte");
  const enAttente = entretiens.filter((e) => e.status === "en_attente");
  const next = aVenir[0];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div>
          <h1 className="font-headline text-xl font-bold text-primary">Mes entretiens</h1>
          <p className="text-sm text-on-surface-variant">
            Vos entretiens confirmés et vos demandes en attente.
          </p>
        </div>

        {/* Next interview hero */}
        {next && (
          <Card className="overflow-hidden bg-primary text-white">
            <CardBody className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative z-10 flex items-center gap-4">
                <div className="min-w-16 rounded-xl bg-white p-3 text-center text-primary">
                  <p className="text-[10px] font-bold uppercase">
                    {new Date(next.date).toLocaleDateString("fr-FR", { month: "short" })}
                  </p>
                  <p className="text-2xl font-bold">{new Date(next.date).getDate()}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-secondary-fixed-dim">
                    Prochain entretien
                  </p>
                  <p className="font-headline text-lg font-bold">{next.entreprise.nom}</p>
                  <p className="text-sm text-white/80">
                    {next.offreTitre} · {formatDate(next.date)} à {next.heure}
                  </p>
                </div>
              </div>
              {next.lienReunion && (
                <ButtonLink href={next.lienReunion} variant="secondary" className="relative z-10">
                  <Icon name="video_call" className="text-[18px]" /> Rejoindre
                </ButtonLink>
              )}
              <Icon
                name="event_available"
                className="pointer-events-none absolute -bottom-4 right-4 text-[130px] text-white/5"
              />
            </CardBody>
          </Card>
        )}

        {/* À venir */}
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 font-headline text-lg font-bold text-primary">
            <Icon name="event_available" className="text-secondary" /> À venir
          </h2>
          {aVenir.length > 0 ? (
            aVenir.map((e) => <EntretienCard key={e.id} entretien={e} viewer="jeune" />)
          ) : (
            <EmptyState icon="event_available" title="Aucun entretien confirmé" />
          )}
        </section>

        {/* En attente */}
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 font-headline text-lg font-bold text-primary">
            <Icon name="schedule" className="text-on-surface-variant" /> En attente de confirmation
          </h2>
          {enAttente.length > 0 ? (
            enAttente.map((e) => <EntretienCard key={e.id} entretien={e} viewer="jeune" />)
          ) : (
            <EmptyState icon="schedule" title="Aucune demande en attente" />
          )}
        </section>
      </div>

      {/* Right rail */}
      <aside className="space-y-4">
        <div className="lg:sticky lg:top-20 space-y-4">
          <Card>
            <CardBody className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="font-headline text-2xl font-bold text-primary">{aVenir.length}</p>
                <p className="text-xs text-on-surface-variant">Confirmés</p>
              </div>
              <div>
                <p className="font-headline text-2xl font-bold text-primary">{enAttente.length}</p>
                <p className="text-xs text-on-surface-variant">En attente</p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-3">
              <h3 className="flex items-center gap-2 font-bold text-primary">
                <Icon name="lightbulb" className="text-secondary" /> Préparer mon entretien
              </h3>
              <ul className="space-y-2">
                {prepChecklist.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-on-surface">
                    <Icon name="check_circle" className="mt-0.5 text-[16px] text-success" />
                    {item}
                  </li>
                ))}
              </ul>
              <ButtonLink href="/espace-jeune/formations" variant="outline" size="sm" fullWidth>
                Formation « Réussir son entretien »
              </ButtonLink>
            </CardBody>
          </Card>
        </div>
      </aside>
    </div>
  );
}
