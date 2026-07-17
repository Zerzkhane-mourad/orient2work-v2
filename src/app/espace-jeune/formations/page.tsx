import { ButtonLink, Card, CardBody, Icon, ProgressBar, StarRating } from "@/components/ui";
import { FormationsCatalog } from "@/features/formations/formations-catalog";
import { formations } from "@/lib/mock-data";

export default function MesFormationsPage() {
  const enCours = formations.filter((f) => f.progression > 0 && f.progression < 100);
  const globalProgress = Math.round(
    formations.reduce((acc, f) => acc + f.progression, 0) / formations.length,
  );

  return (
    <div className="space-y-8">
      {/* Learning hero — Udemy dark banner */}
      <Card className="overflow-hidden border-0 bg-primary text-white">
        <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="font-headline text-2xl font-bold">Apprenez sans limites</h1>
            <p className="max-w-md text-sm text-white/70">
              Développez votre employabilité avec des formations certifiantes. Reprenez là où vous
              vous êtes arrêté.
            </p>
          </div>
          <div className="min-w-52 rounded-xl bg-white/10 p-4 backdrop-blur">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-white/80">Progression globale</span>
              <span className="font-bold text-secondary-fixed-dim">{globalProgress}%</span>
            </div>
            <ProgressBar value={globalProgress} className="bg-white/20" />
          </div>
        </CardBody>
      </Card>

      {/* Continue learning */}
      {enCours.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-headline text-lg font-bold text-primary">Continuer l&apos;apprentissage</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {enCours.map((f) => (
              <Card key={f.id} interactive>
                <ButtonLink
                  href={`/espace-jeune/formations/${f.id}`}
                  variant="ghost"
                  className="flex w-full items-center gap-4 rounded-xl p-4 text-left"
                >
                  <span className="flex h-16 w-24 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-container">
                    <Icon name="play_arrow" filled className="text-3xl text-white/90" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold text-primary">{f.titre}</span>
                    {typeof f.note === "number" && (
                      <StarRating value={f.note} count={f.nombreAvis} className="my-1" />
                    )}
                    <ProgressBar value={f.progression} className="h-1.5" />
                    <span className="mt-1 block text-xs text-on-surface-variant">
                      {f.progression}% · Reprendre
                    </span>
                  </span>
                </ButtonLink>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Catalog */}
      <section className="space-y-4">
        <div>
          <h2 className="font-headline text-lg font-bold text-primary">Catalogue de formations</h2>
          <p className="text-sm text-on-surface-variant">
            Formations communes et de spécialité selon votre filière.
          </p>
        </div>
        <FormationsCatalog formations={formations} detailBase="/espace-jeune/formations" />
      </section>
    </div>
  );
}
