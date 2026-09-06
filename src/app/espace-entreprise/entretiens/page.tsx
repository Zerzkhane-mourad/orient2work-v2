"use client";

import {
  Card,
  CardBody,
  EmptyState,
  ErrorState,
  Icon,
  PageHeader,
  Pagination,
  PerPageSelect,
  SkeletonList,
} from "@/components/ui";
import { EntretienCard } from "@/features/entretiens/entretien-card";

import {
  ENTRETIENS_PER_PAGE_OPTIONS,
  useEntretiensCounts,
  useEntretiensPageSize,
  useEntretiensSection,
} from "@/features/entretiens/use-entretiens-sections";

/** Constantes de module : un tableau recréé à chaque rendu boucle la requête. */
const EN_ATTENTE = ["en_attente"] as const;
const CONFIRMES = ["accepte"] as const;
const CLOS = ["refuse", "annule"] as const;

export default function EntretiensEntreprisePage() {
  // Le périmètre (entretiens de MON entreprise) est déduit du rôle par le serveur.
  // Chaque section est paginée par l'API ; les trois compteurs portent sur le lot
  // complet et viennent donc d'un endpoint séparé.
  // Une densité unique pour l'écran : la changer s'applique à toutes les
  // sections, chacune restant sur sa propre page.
  const tailleSections = useEntretiensPageSize("entreprise-entretiens");

  const sectionEnAttente = useEntretiensSection(EN_ATTENTE, tailleSections);
  const sectionConfirmes = useEntretiensSection(CONFIRMES, tailleSections);
  const sectionClos = useEntretiensSection(CLOS, tailleSections);
  const counts = useEntretiensCounts();

  const loading = sectionEnAttente.loading || sectionConfirmes.loading || sectionClos.loading;
  const error = sectionEnAttente.error ?? sectionConfirmes.error ?? sectionClos.error;

  const reload = () => {
    sectionEnAttente.refetch();
    sectionConfirmes.refetch();
    sectionClos.refetch();
    counts.refetch();
  };

  const stats = [
    { label: "En attente", value: counts.somme("en_attente"), icon: "schedule" },
    { label: "Confirmés", value: counts.somme("accepte"), icon: "event_available" },
    { label: "Clos", value: counts.somme("refuse", "annule"), icon: "event_busy" },
  ] as const;

  const total = stats.reduce((sum, stat) => sum + stat.value, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Entretiens"
        subtitle="Suivez les propositions envoyées et les réponses des candidats."
        actions={
          /* Un seul réglage en tête d'écran : les trois sections le suivent. */
          !loading && total > tailleSections.perPage ? (
            <PerPageSelect
              value={tailleSections.perPage}
              options={ENTRETIENS_PER_PAGE_OPTIONS}
              label="Par section"
              onChange={tailleSections.setPerPage}
            />
          ) : undefined
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardBody className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-secondary-container text-on-secondary-container">
                <Icon name={s.icon} />
              </span>
              <div>
                <p className="font-headline text-2xl font-bold text-primary">
                  {counts.loading ? "—" : s.value}
                </p>
                <p className="text-xs text-on-surface-variant">{s.label}</p>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading ? (
        <SkeletonList count={3} />
      ) : total === 0 ? (
        <EmptyState
          icon="event"
          title="Aucun entretien"
          description="Proposez un entretien depuis une candidature reçue ou depuis un profil de talent."
        />
      ) : (
        <>
          <section ref={sectionEnAttente.listRef} className="space-y-3">
            <h2 className="flex items-center gap-2 font-headline text-lg font-bold text-primary">
              <Icon name="schedule" className="text-on-surface-variant" /> En attente de réponse du
              candidat
            </h2>
            {sectionEnAttente.items.length > 0 ? (
              <>
                {sectionEnAttente.items.map((e) => (
                  <EntretienCard key={e.id} entretien={e} viewer="entreprise" onChanged={reload} />
                ))}
                {/* Le titre de section porte déjà le contexte : la pagination
                    n'apparaît que lorsqu'elle sert vraiment à naviguer. */}
                {sectionEnAttente.meta && sectionEnAttente.meta.totalPages > 1 && (
                  <Pagination
                    meta={sectionEnAttente.meta}
                    onPageChange={sectionEnAttente.goTo}
                    busy={sectionEnAttente.loading}
                    unit="proposition"
                  />
                )}
              </>
            ) : (
              <p className="text-sm text-on-surface-variant">Aucune proposition en attente.</p>
            )}
          </section>

          <section ref={sectionConfirmes.listRef} className="space-y-3">
            <h2 className="flex items-center gap-2 font-headline text-lg font-bold text-primary">
              <Icon name="event_available" className="text-secondary" /> Confirmés
            </h2>
            {sectionConfirmes.items.length > 0 ? (
              <>
                {sectionConfirmes.items.map((e) => (
                  <EntretienCard key={e.id} entretien={e} viewer="entreprise" onChanged={reload} />
                ))}
                {sectionConfirmes.meta && sectionConfirmes.meta.totalPages > 1 && (
                  <Pagination
                    meta={sectionConfirmes.meta}
                    onPageChange={sectionConfirmes.goTo}
                    busy={sectionConfirmes.loading}
                    unit="entretien"
                  />
                )}
              </>
            ) : (
              <p className="text-sm text-on-surface-variant">Aucun entretien confirmé.</p>
            )}
          </section>

          {sectionClos.items.length > 0 && (
            <section ref={sectionClos.listRef} className="space-y-3">
              <h2 className="flex items-center gap-2 font-headline text-lg font-bold text-primary">
                <Icon name="event_busy" className="text-on-surface-variant" /> Refusés ou annulés
              </h2>
              {sectionClos.items.map((e) => (
                <EntretienCard key={e.id} entretien={e} viewer="entreprise" onChanged={reload} />
              ))}
              {sectionClos.meta && sectionClos.meta.totalPages > 1 && (
                <Pagination
                  meta={sectionClos.meta}
                  onPageChange={sectionClos.goTo}
                  busy={sectionClos.loading}
                  unit="entretien"
                />
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
