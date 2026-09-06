"use client";

/**
 * Calendrier de l'entreprise.
 *
 * Deux usages très différents cohabitaient dans un même défilement : l'agenda —
 * consulté tous les jours — et le réglage des disponibilités — fait une fois
 * puis retouché de loin en loin. Il fallait faire défiler un formulaire entier
 * pour revoir ses rendez-vous, et la page portait DEUX calendriers mensuels
 * l'un sous l'autre.
 *
 * Ils sont désormais séparés en deux onglets : on choisit ce qu'on vient faire.
 */
import { useMemo, useState } from "react";
import {
  Button,
  ButtonLink,
  Card,
  CardBody,
  EmptyState,
  ErrorState,
  Icon,
  PageHeader,
  SkeletonList,
  StatusBadge,
} from "@/components/ui";
import { DisponibilitesEditor } from "@/features/entreprise/disponibilites-editor";
import { api } from "@/lib/api";
import { API_MAX_PER_PAGE, type ApiEntretien } from "@/lib/api/types";
import { useApi } from "@/lib/api/use-api";
import { cn, formatDate } from "@/lib/utils";

const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

/** Statuts qui figurent à l'agenda : annulés et refusés n'y ont pas leur place. */
const ENTRETIENS_AGENDA = ["en_attente", "accepte"] as const;

type Onglet = "agenda" | "disponibilites";

/** Clé `YYYY-MM-DD`, en UTC pour coller au format renvoyé par l'API. */
function dayKey(date: Date): string {
  return date.toISOString().split("T")[0]!;
}

/** Premier et dernier jour du mois affiché, au format attendu par l'API. */
function moisAffiche(offset: number): { debut: string; fin: string } {
  const today = new Date();
  const premier = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + offset, 1));
  const dernier = new Date(Date.UTC(premier.getUTCFullYear(), premier.getUTCMonth() + 1, 0));
  return { debut: dayKey(premier), fin: dayKey(dernier) };
}

export default function CalendrierPage() {
  const [onglet, setOnglet] = useState<Onglet>("agenda");
  const [monthOffset, setMonthOffset] = useState(0);
  /** Jour retenu dans la grille ; `null` = vue « prochains entretiens ». */
  const [jourChoisi, setJourChoisi] = useState<string | null>(null);

  // Une grille mensuelle a besoin de TOUS les entretiens du mois : elle ne peut
  // pas être paginée. La borne est donc temporelle — on ne charge que le mois
  // affiché, ce qui tient largement sous le plafond de l'API et redescend à
  // chaque changement de mois.
  const { debut, fin } = useMemo(() => moisAffiche(monthOffset), [monthOffset]);

  const { data, loading, error, refetch } = useApi(
    () =>
      api.entretiens.list({
        from: debut,
        to: fin,
        perPage: API_MAX_PER_PAGE,
        status: ENTRETIENS_AGENDA,
      }),
    [debut, fin],
  );

  const entretiens = useMemo(() => data?.items ?? [], [data]);

  /** Entretiens indexés par jour, pour peindre la grille sans la reparcourir. */
  const parJour = useMemo(() => {
    const map = new Map<string, ApiEntretien[]>();
    for (const e of entretiens) {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    // Une journée se lit dans l'ordre des heures.
    for (const liste of map.values()) liste.sort((a, b) => a.heure.localeCompare(b.heure));
    return map;
  }, [entretiens]);

  const today = new Date();
  const cursor = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + monthOffset, 1));
  const monthLabel = cursor.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  // Grille alignée sur lundi : `getUTCDay()` renvoie 0 pour dimanche.
  const firstWeekday = (cursor.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(
    Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0),
  ).getUTCDate();

  const cells: (Date | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from(
      { length: daysInMonth },
      (_, i) => new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), i + 1)),
    ),
  ];

  const aVenir = entretiens
    .filter((e) => e.date >= dayKey(today))
    .sort((a, b) => (a.date + a.heure).localeCompare(b.date + b.heure));

  const duJour = jourChoisi ? (parJour.get(jourChoisi) ?? []) : null;

  const changerMois = (pas: number) => {
    setMonthOffset((m) => m + pas);
    // La sélection appartient au mois qu'on quitte.
    setJourChoisi(null);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Calendrier"
        subtitle="Vos entretiens planifiés et vos disponibilités."
        actions={
          <ButtonLink href="/espace-entreprise/candidatures" variant="secondary">
            <Icon name="event" className="text-[18px]" /> Proposer un entretien
          </ButtonLink>
        }
      />

      {/*
        Deux onglets plutôt qu'un long défilement : consulter son agenda et
        régler ses horaires ne se font ni au même moment, ni à la même fréquence.
      */}
      <div role="tablist" aria-label="Vues du calendrier" className="flex gap-2">
        <Onglet
          actif={onglet === "agenda"}
          onClick={() => setOnglet("agenda")}
          icone="event"
          compte={loading ? undefined : aVenir.length}
        >
          Agenda
        </Onglet>
        <Onglet
          actif={onglet === "disponibilites"}
          onClick={() => setOnglet("disponibilites")}
          icone="schedule"
        >
          Mes disponibilités
        </Onglet>
      </div>

      {onglet === "agenda" ? (
        error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : loading ? (
          <SkeletonList count={2} />
        ) : (
          <div className="grid gap-5 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardBody className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => changerMois(-1)}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container"
                    aria-label="Mois précédent"
                  >
                    <Icon name="chevron_right" className="rotate-180 text-[20px]" />
                  </button>

                  <div className="flex items-center gap-2">
                    <p className="font-headline font-bold capitalize text-primary">{monthLabel}</p>
                    {/* Sans ce retour, on s'éloigne dans les mois sans moyen
                        simple de revenir au présent. */}
                    {monthOffset !== 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setMonthOffset(0);
                          setJourChoisi(null);
                        }}
                      >
                        Aujourd&apos;hui
                      </Button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => changerMois(1)}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container"
                    aria-label="Mois suivant"
                  >
                    <Icon name="chevron_right" className="text-[20px]" />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center">
                  {JOURS.map((j) => (
                    <span
                      key={j}
                      className="pb-1 text-[11px] font-bold uppercase text-on-surface-variant"
                    >
                      {j}
                    </span>
                  ))}

                  {cells.map((date, i) => {
                    if (!date) return <span key={`empty-${i}`} />;
                    const key = dayKey(date);
                    const items = parJour.get(key) ?? [];
                    const isToday = key === dayKey(today);
                    const actif = key === jourChoisi;

                    return (
                      <button
                        key={key}
                        type="button"
                        // Toute la journée est cliquable : la grille tronquait
                        // à deux entretiens et « +2 » n'ouvrait rien.
                        onClick={() => setJourChoisi(actif ? null : key)}
                        aria-pressed={actif}
                        aria-label={`${date.getUTCDate()} ${monthLabel} — ${items.length} entretien${items.length > 1 ? "s" : ""}`}
                        className={cn(
                          "flex min-h-16 flex-col items-center rounded-lg border p-1 text-sm transition-colors",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary",
                          actif
                            ? "border-primary bg-primary/[0.06]"
                            : items.length > 0
                              ? "border-secondary bg-secondary-container/30 hover:border-primary"
                              : "border-transparent hover:bg-surface-container-low",
                          isToday && !actif && "ring-1 ring-primary",
                        )}
                      >
                        <span
                          className={cn(
                            "font-semibold",
                            isToday || actif ? "text-primary" : "text-on-surface-variant",
                          )}
                        >
                          {date.getUTCDate()}
                        </span>
                        {items.slice(0, 2).map((e) => (
                          <span
                            key={e.id}
                            className="mt-0.5 w-full truncate rounded bg-secondary-container px-1 text-[10px] font-medium text-on-secondary-container"
                          >
                            {e.heure} {e.jeune.prenom}
                          </span>
                        ))}
                        {items.length > 2 && (
                          <span className="text-[10px] font-semibold text-primary">
                            +{items.length - 2}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardBody>
            </Card>

            {/* Le panneau suit la grille : jour retenu, ou prochains rendez-vous. */}
            <Card>
              <CardBody className="space-y-3">
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="font-headline font-bold text-primary">
                    {duJour ? formatDate(jourChoisi!) : "Prochains entretiens"}
                  </h2>
                  {duJour && (
                    <button
                      type="button"
                      onClick={() => setJourChoisi(null)}
                      className="text-xs font-semibold text-on-surface-variant hover:text-primary"
                    >
                      Tout voir
                    </button>
                  )}
                </div>

                {(duJour ?? aVenir).length === 0 ? (
                  <EmptyState
                    icon="event"
                    title={duJour ? "Aucun entretien ce jour" : "Aucun entretien à venir"}
                  />
                ) : (
                  (duJour ?? aVenir).slice(0, 8).map((e) => (
                    <div key={e.id} className="rounded-lg border border-outline-variant p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-primary">
                          {e.jeune.prenom} {e.jeune.nom}
                        </p>
                        <StatusBadge kind="entretien" status={e.status} />
                      </div>
                      <p className="text-xs text-on-surface-variant">{e.offreTitre}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-on-surface-variant">
                        <Icon name="event" className="text-[14px]" />
                        {duJour ? e.heure : `${formatDate(e.date)} à ${e.heure}`}
                      </p>
                      {e.spontanee && (
                        <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-secondary-container px-2 py-0.5 text-[11px] font-bold text-on-secondary-container">
                          <Icon name="handshake" className="text-[12px]" /> Spontanée
                        </span>
                      )}
                    </div>
                  ))
                )}

                <ButtonLink
                  href="/espace-entreprise/entretiens"
                  variant="outline"
                  size="sm"
                  fullWidth
                >
                  Gérer les entretiens
                </ButtonLink>
              </CardBody>
            </Card>
          </div>
        )
      ) : (
        <section className="space-y-3">
          <div>
            <h2 className="font-headline text-lg font-bold text-primary">
              Candidatures spontanées
            </h2>
            <p className="text-sm text-on-surface-variant">
              Ouvrez des créneaux : les jeunes validés réservent un échange sans passer par une
              offre. Les rendez-vous pris apparaissent dans l&apos;agenda.
            </p>
          </div>
          <DisponibilitesEditor />
        </section>
      )}
    </div>
  );
}

/** Onglet de navigation, avec compteur facultatif. */
function Onglet({
  actif,
  onClick,
  icone,
  compte,
  children,
}: {
  actif: boolean;
  onClick: () => void;
  icone: "event" | "schedule";
  compte?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={actif}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors",
        actif
          ? "bg-primary text-on-primary"
          : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high",
      )}
    >
      <Icon name={icone} className="text-[18px]" />
      {children}
      {compte !== undefined && (
        <span
          className={cn(
            "rounded-full px-1.5 text-xs tabular-nums",
            actif ? "bg-white/20" : "bg-surface-container-highest",
          )}
        >
          {compte}
        </span>
      )}
    </button>
  );
}
