import { ButtonLink, Card, CardBody, CardHeader, CardTitle, Icon, Stat, StatusBadge } from "@/components/ui";
import { currentEntreprise, entretiens, offres } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";

export default function EspaceEntrepriseDashboard() {
  const c = currentEntreprise;
  const myOffres = offres.filter((o) => o.status === "publiee");
  const pendingInterviews = entretiens.filter((e) => e.status === "en_attente");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-headline text-headline-lg font-bold text-primary">{c.nom}</h1>
          <p className="text-on-surface-variant">Tableau de bord recruteur.</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge kind="entreprise" status={c.status} />
          <ButtonLink href="/espace-entreprise/publier" variant="secondary">
            <Icon name="add" className="text-[18px]" /> Publier une offre
          </ButtonLink>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Offres actives" value={myOffres.length} icon="work" />
        <Stat label="Candidatures reçues" value={20} icon="inbox" caption="+5 cette semaine" />
        <Stat label="Entretiens à confirmer" value={pendingInterviews.length} icon="event" />
        <Stat label="Talents consultés" value={48} icon="groups" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Mes offres publiées</CardTitle>
            <ButtonLink href="/espace-entreprise/offres" variant="ghost" size="sm">
              Gérer
            </ButtonLink>
          </CardHeader>
          <CardBody className="space-y-2">
            {myOffres.map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between rounded-lg p-3 hover:bg-surface-container-low"
              >
                <div>
                  <p className="font-semibold text-primary">{o.titre}</p>
                  <p className="text-xs text-on-surface-variant">
                    {o.type} • Limite {formatDate(o.dateLimite)}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1 text-sm text-on-surface-variant">
                    <Icon name="person" className="text-[16px]" /> {o.candidatures}
                  </span>
                  <StatusBadge kind="offre" status={o.status} />
                </div>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Demandes d&apos;entretien</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            {pendingInterviews.map((e) => (
              <div key={e.id} className="rounded-lg border border-outline-variant p-3">
                <p className="font-semibold text-primary">
                  {e.jeune.prenom} {e.jeune.nom}
                </p>
                <p className="text-xs text-on-surface-variant">
                  {e.offreTitre} • {formatDate(e.date)} à {e.heure}
                </p>
                <ButtonLink href="/espace-entreprise/entretiens" variant="ghost" size="sm" className="mt-1 px-0">
                  Répondre →
                </ButtonLink>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
