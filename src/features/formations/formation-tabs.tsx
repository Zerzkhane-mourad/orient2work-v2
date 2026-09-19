"use client";

/**
 * Onglets sous le lecteur, comme sur Udemy : « Aperçu » (objectifs,
 * prérequis, description) et « Avis ». Le lecteur reste au premier plan ; le
 * reste est à un clic, sans allonger la page.
 */
import { Card, CardBody, Icon } from "@/components/ui";
import type { ApiFormation } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { AvisSection } from "./avis/avis-section";

export type FormationTab = "apercu" | "avis";

interface FormationTabsProps {
  formation: ApiFormation;
  tab: FormationTab;
  onTabChange: (tab: FormationTab) => void;
  canReview: boolean;
}

export function FormationTabs({
  formation,
  tab,
  onTabChange,
  canReview,
}: FormationTabsProps) {
  const tabs: { id: FormationTab; label: string }[] = [
    { id: "apercu", label: "Aperçu" },
    {
      id: "avis",
      label:
        formation.nombreAvis > 0 ? `Avis (${formation.nombreAvis})` : "Avis",
    },
  ];

  return (
    <section id="details" className="scroll-mt-20">
      <div
        role="tablist"
        aria-label="Détails de la formation"
        className="mb-5 flex gap-6 border-b border-outline-variant"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            id={`onglet-${t.id}`}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`panneau-${t.id}`}
            onClick={() => onTabChange(t.id)}
            className={cn(
              "-mb-px min-h-11 border-b-2 px-1 text-sm font-bold transition-colors",
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-on-surface-variant hover:text-primary",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div
        id={`panneau-${tab}`}
        role="tabpanel"
        aria-labelledby={`onglet-${tab}`}
      >
        {tab === "apercu" ? (
          <Apercu formation={formation} />
        ) : (
          <AvisSection formationId={formation.id} canReview={canReview} />
        )}
      </div>
    </section>
  );
}

function Apercu({ formation }: { formation: ApiFormation }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0 space-y-6">
        {formation.objectifs.length > 0 && (
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 sm:p-6">
            <h2 className="mb-4 font-headline text-xl font-bold text-primary">
              Ce que vous allez apprendre
            </h2>
            <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {formation.objectifs.map((objectif) => (
                <li
                  key={objectif}
                  className="flex items-start gap-2.5 text-sm text-on-surface"
                >
                  <Icon
                    name="check"
                    className="mt-0.5 shrink-0 text-[18px] text-success"
                  />
                  {objectif}
                </li>
              ))}
            </ul>
          </div>
        )}

        {formation.prerequis.length > 0 && (
          <div>
            <h2 className="mb-3 font-headline text-xl font-bold text-primary">
              Prérequis
            </h2>
            <ul className="space-y-2">
              {formation.prerequis.map((prerequis) => (
                <li
                  key={prerequis}
                  className="flex items-start gap-2.5 text-sm text-on-surface"
                >
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-on-surface" />
                  {prerequis}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <h2 className="mb-3 font-headline text-xl font-bold text-primary">
            Description
          </h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-on-surface">
            {formation.description}
          </p>
        </div>
      </div>

      <Card className="h-fit">
        <CardBody className="space-y-3 text-sm">
          <p className="font-bold text-on-surface">En bref</p>
          <Fait label="Catégorie" value={formation.categorie} />
          {formation.filiere && (
            <Fait label="Filière" value={formation.filiere} />
          )}
          {formation.niveau && <Fait label="Niveau" value={formation.niveau} />}
          <Fait label="Durée" value={`${formation.tempsLectureMin} min`} />
          {formation.quiz && (
            <Fait
              label="Réussite du test"
              value={`${formation.quiz.scoreMinimum}% minimum`}
            />
          )}
          {formation.instructeur && (
            <Fait label="Auteur" value={formation.instructeur} />
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function Fait({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-outline-variant pb-2 last:border-0 last:pb-0">
      <span className="text-on-surface-variant">{label}</span>
      <span className="text-right font-semibold text-on-surface">{value}</span>
    </div>
  );
}
