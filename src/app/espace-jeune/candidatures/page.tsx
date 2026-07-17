"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge, ButtonLink, Card, CardBody, EmptyState, Icon } from "@/components/ui";
import { offres } from "@/lib/mock-data";
import { formatDate, cn } from "@/lib/utils";

type CandidatureState = "envoyee" | "vue" | "entretien" | "refusee";

const STEPS = ["envoyee", "vue", "entretien"] as const;
const STEP_LABELS: Record<(typeof STEPS)[number], string> = {
  envoyee: "Envoyée",
  vue: "Vue",
  entretien: "Entretien",
};

const stateConfig: Record<
  CandidatureState,
  { label: string; tone: React.ComponentProps<typeof Badge>["tone"]; icon: string }
> = {
  envoyee: { label: "En attente", tone: "info", icon: "schedule" },
  vue: { label: "Vue par l'entreprise", tone: "primary", icon: "visibility" },
  entretien: { label: "Entretien proposé", tone: "success", icon: "event_available" },
  refusee: { label: "Non retenue", tone: "error", icon: "do_not_disturb_on" },
};

// Applications sent by the young talent (§5.8).
const candidatures = [
  { offre: offres[0], date: "2026-07-08", state: "entretien" as CandidatureState },
  { offre: offres[1], date: "2026-07-10", state: "vue" as CandidatureState },
  { offre: offres[2], date: "2026-07-12", state: "envoyee" as CandidatureState },
];

const tabs = [
  { key: "toutes", label: "Toutes" },
  { key: "encours", label: "En cours" },
  { key: "entretien", label: "Entretiens" },
  { key: "refusee", label: "Non retenues" },
] as const;

function StatusStepper({ state }: { state: CandidatureState }) {
  if (state === "refusee") {
    return (
      <div className="flex items-center gap-1 text-xs font-semibold text-error">
        <Icon name="do_not_disturb_on" className="text-[16px]" /> Candidature clôturée
      </div>
    );
  }
  const reached = STEPS.indexOf(state as (typeof STEPS)[number]);
  return (
    <div className="flex items-center">
      {STEPS.map((step, i) => (
        <div key={step} className="flex items-center">
          <div className="flex flex-col items-center gap-1">
            <span
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold",
                i <= reached
                  ? "bg-secondary-container text-on-secondary-container"
                  : "bg-surface-variant text-on-surface-variant",
              )}
            >
              {i < reached ? <Icon name="check" className="text-[12px]" /> : i + 1}
            </span>
            <span
              className={cn(
                "text-[10px] font-medium",
                i <= reached ? "text-primary" : "text-on-surface-variant",
              )}
            >
              {STEP_LABELS[step]}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <span
              className={cn(
                "mx-1 mb-4 h-0.5 w-8 rounded-full",
                i < reached ? "bg-secondary-container" : "bg-surface-variant",
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default function MesCandidaturesPage() {
  const [tab, setTab] = useState<(typeof tabs)[number]["key"]>("toutes");

  const filtered = useMemo(() => {
    switch (tab) {
      case "encours":
        return candidatures.filter((c) => c.state === "envoyee" || c.state === "vue");
      case "entretien":
        return candidatures.filter((c) => c.state === "entretien");
      case "refusee":
        return candidatures.filter((c) => c.state === "refusee");
      default:
        return candidatures;
    }
  }, [tab]);

  const stats = [
    { label: "Envoyées", value: candidatures.length },
    { label: "En cours", value: candidatures.filter((c) => c.state !== "refusee").length },
    { label: "Entretiens", value: candidatures.filter((c) => c.state === "entretien").length },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Header + stats */}
      <Card>
        <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-headline text-xl font-bold text-primary">Mes candidatures</h1>
            <p className="text-sm text-on-surface-variant">Suivez l&apos;avancement de chaque candidature.</p>
          </div>
          <div className="flex gap-6">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="font-headline text-2xl font-bold text-primary">{s.value}</p>
                <p className="text-xs text-on-surface-variant">{s.label}</p>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
              tab === t.key
                ? "bg-primary text-on-primary"
                : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="send"
          title="Aucune candidature dans cette catégorie"
          description="Parcourez les offres et postulez à celles qui vous correspondent."
          action={
            <ButtonLink href="/espace-jeune/offres" variant="secondary">
              Voir les offres
            </ButtonLink>
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map(({ offre, date, state }) => {
            const cfg = stateConfig[state];
            return (
              <Card key={offre.id}>
                <CardBody className="space-y-4">
                  <div className="flex items-start gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-surface-container-highest text-primary">
                      <Icon name="business" className="text-2xl" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/espace-jeune/offres/${offre.id}`}
                        className="font-bold text-primary hover:underline"
                      >
                        {offre.titre}
                      </Link>
                      <p className="truncate text-sm text-on-surface-variant">
                        {offre.entreprise.nom} · {offre.ville}
                      </p>
                      <p className="mt-0.5 text-xs text-on-surface-variant">
                        Envoyée le {formatDate(date)}
                      </p>
                    </div>
                    <Badge tone={cfg.tone} icon={cfg.icon}>
                      {cfg.label}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between border-t border-outline-variant pt-4">
                    <StatusStepper state={state} />
                    <ButtonLink href={`/espace-jeune/offres/${offre.id}`} variant="ghost" size="sm">
                      Voir l&apos;offre →
                    </ButtonLink>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
