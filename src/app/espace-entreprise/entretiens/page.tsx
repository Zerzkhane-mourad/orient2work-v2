"use client";

/**
 * Entretiens (espace entreprise).
 *
 * L'écran est ordonné par CE QUE L'ENTREPRISE DOIT FAIRE, et non par statut de
 * base de données.
 *
 * ── La correction de fond ───────────────────────────────────────────────────
 *
 * Une seule section « en attente » rassemblait deux choses opposées :
 *  • les entretiens PROPOSÉS par l'entreprise, qui attendent le candidat ;
 *  • les candidatures SPONTANÉES, réservées par le candidat, qui attendent
 *    l'entreprise.
 *
 * Le titre — « En attente de réponse du candidat » — classait donc la seule
 * file de travail du recruteur dans une liste qui lui dit de patienter. Les
 * demandes spontanées y dormaient jusqu'à expiration du créneau, alors que le
 * candidat, lui, voyait sa réservation bloquée.
 *
 * Les deux sont désormais deux sections distinctes, celle qui appelle un geste
 * en tête. Le serveur sait déjà les séparer (`spontanee`), il suffisait de le
 * lui demander.
 *
 * Les totaux viennent des `meta` de chaque section, exacts par construction :
 * l'appel aux compteurs par statut ne sait pas distinguer une proposition d'une
 * demande spontanée.
 */
import {
  ButtonLink,
  Card,
  CardBody,
  EmptyState,
  ErrorState,
  Icon,
  PageHeader,
  Pagination,
  PerPageSelect,
  SkeletonList,
  type IconName,
} from "@/components/ui";
import { EntretienCard } from "@/features/entretiens/entretien-card";

import {
  ENTRETIENS_PER_PAGE_OPTIONS,
  useEntretiensPageSize,
  useEntretiensSection,
  type EntretiensSection,
} from "@/features/entretiens/use-entretiens-sections";
import { cn } from "@/lib/utils";

/** Constantes de module : un tableau recréé à chaque rendu boucle la requête. */
const EN_ATTENTE = ["en_attente"] as const;
const CONFIRMES = ["accepte"] as const;
const CLOS = ["refuse", "annule"] as const;

export default function EntretiensEntreprisePage() {
  // Le périmètre (entretiens de MON entreprise) est déduit du rôle par le serveur.
  // Une densité unique pour l'écran : la changer s'applique à toutes les
  // sections, chacune restant sur sa propre page.
  const taille = useEntretiensPageSize("entreprise-entretiens");

  // Réservée par le candidat : c'est à l'entreprise de trancher.
  const aTraiter = useEntretiensSection(EN_ATTENTE, taille, { spontanee: true });
  // Proposée par l'entreprise : c'est le candidat qui répond.
  const proposees = useEntretiensSection(EN_ATTENTE, taille, { spontanee: false });
  const confirmes = useEntretiensSection(CONFIRMES, taille);
  const clos = useEntretiensSection(CLOS, taille);

  const loading = aTraiter.loading || proposees.loading || confirmes.loading || clos.loading;
  const error = aTraiter.error ?? proposees.error ?? confirmes.error ?? clos.error;

  const reload = () => {
    aTraiter.refetch();
    proposees.refetch();
    confirmes.refetch();
    clos.refetch();
  };

  const nbATraiter = aTraiter.meta?.total ?? 0;

  const stats: Array<{ label: string; value: number; icon: IconName; accent: boolean }> = [
    { label: "À traiter", value: nbATraiter, icon: "priority_high", accent: nbATraiter > 0 },
    { label: "Attente candidat", value: proposees.meta?.total ?? 0, icon: "schedule", accent: false },
    { label: "Confirmés", value: confirmes.meta?.total ?? 0, icon: "event_available", accent: false },
    { label: "Clos", value: clos.meta?.total ?? 0, icon: "event_busy", accent: false },
  ];

  const total = stats.reduce((somme, stat) => somme + stat.value, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Entretiens"
        subtitle="Les demandes qui vous attendent, les propositions envoyées et vos rendez-vous."
        actions={
          /* Un seul réglage en tête d'écran : les quatre sections le suivent. */
          !loading && total > taille.perPage ? (
            <PerPageSelect
              value={taille.perPage}
              options={ENTRETIENS_PER_PAGE_OPTIONS}
              label="Par section"
              onChange={taille.setPerPage}
            />
          ) : undefined
        }
      />

      {/*
        Le créneau d'une demande spontanée reste BLOQUÉ chez le candidat tant
        qu'elle n'est pas tranchée : le rappel est en tête d'écran, et non au
        niveau de la section, pour être lu avant tout défilement.
      */}
      {!loading && nbATraiter > 0 && (
        <p className="flex flex-wrap items-center gap-3 rounded-xl bg-secondary-container px-4 py-3 text-sm text-on-secondary-container">
          <Icon name="handshake" className="text-[20px]" />
          <span className="flex-1">
            <strong className="font-bold">
              {nbATraiter} candidature{nbATraiter > 1 ? "s" : ""} spontanée
              {nbATraiter > 1 ? "s" : ""}
            </strong>{" "}
            {nbATraiter > 1 ? "attendent" : "attend"} votre réponse — le créneau réservé reste
            bloqué jusque-là.
          </span>
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className={cn(s.accent && "border-secondary")}>
            <CardBody className="flex items-center gap-3">
              <span
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg",
                  s.accent
                    ? "bg-secondary text-on-secondary"
                    : "bg-secondary-container text-on-secondary-container",
                )}
              >
                <Icon name={s.icon} />
              </span>
              <div className="min-w-0">
                <p className="font-headline text-2xl font-bold text-primary">
                  {loading ? "—" : s.value}
                </p>
                <p className="truncate text-xs text-on-surface-variant">{s.label}</p>
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
          description="Proposez un entretien depuis une candidature reçue ou depuis un profil de talent. Vous pouvez aussi ouvrir des créneaux pour recevoir des candidatures spontanées."
          action={
            <ButtonLink href="/espace-entreprise/calendrier?vue=disponibilites" variant="secondary">
              <Icon name="schedule" className="text-[18px]" /> Ouvrir des créneaux
            </ButtonLink>
          }
        />
      ) : (
        <>
          <Section
            section={aTraiter}
            icon="handshake"
            titre="Candidatures spontanées à traiter"
            sousTitre="Ces candidats ont réservé un créneau chez vous : acceptez ou déclinez."
            accent
            vide="Aucune candidature spontanée en attente"
            onChanged={reload}
          />

          <Section
            section={proposees}
            icon="schedule"
            titre="En attente de réponse du candidat"
            sousTitre="Propositions que vous avez envoyées."
            vide="Aucune proposition en attente"
            onChanged={reload}
          />

          <Section
            section={confirmes}
            icon="event_available"
            titre="Confirmés"
            vide="Aucun entretien confirmé"
            onChanged={reload}
          />

          <Section
            section={clos}
            icon="event_busy"
            titre="Refusés ou annulés"
            vide="Aucun entretien clos"
            onChanged={reload}
          />
        </>
      )}
    </div>
  );
}

/**
 * Section de liste, repliée sur elle-même quand elle est vide.
 *
 * Une section vide gardait la même hauteur qu'une section pleine : à quatre
 * sections, trois encadrés « aucun élément » repoussaient hors de l'écran le
 * seul contenu réel. Elle se réduit maintenant à une ligne.
 */
function Section({
  section,
  icon,
  titre,
  sousTitre,
  accent,
  vide,
  onChanged,
}: {
  section: EntretiensSection;
  icon: IconName;
  titre: string;
  sousTitre?: string;
  /** Section qui appelle un geste : elle se distingue du reste de l'écran. */
  accent?: boolean;
  vide: string;
  onChanged: () => void;
}) {
  const total = section.meta?.total ?? 0;

  if (section.items.length === 0) {
    return (
      <p className="flex items-center gap-2 rounded-lg bg-surface-container-low px-3 py-2 text-sm text-on-surface-variant">
        <Icon name={icon} className="text-[18px]" />
        {vide}
      </p>
    );
  }

  return (
    <section
      ref={section.listRef}
      className={cn(
        "space-y-3",
        accent && "rounded-xl border-2 border-secondary bg-secondary-container/20 p-4",
      )}
    >
      <div>
        <h2 className="flex flex-wrap items-center gap-2 font-headline text-lg font-bold text-primary">
          <Icon name={icon} className={accent ? "text-secondary" : "text-on-surface-variant"} />
          {titre}
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-bold tabular-nums",
              accent
                ? "bg-secondary text-on-secondary"
                : "bg-surface-container text-on-surface-variant",
            )}
          >
            {total}
          </span>
        </h2>
        {sousTitre && <p className="text-sm text-on-surface-variant">{sousTitre}</p>}
      </div>

      {section.items.map((e) => (
        <EntretienCard key={e.id} entretien={e} viewer="entreprise" onChanged={onChanged} />
      ))}

      {/* Le titre de section porte déjà le contexte : la pagination n'apparaît
          que lorsqu'elle sert vraiment à naviguer. */}
      {section.meta && section.meta.totalPages > 1 && (
        <Pagination
          meta={section.meta}
          onPageChange={section.goTo}
          busy={section.loading}
          unit="entretien"
        />
      )}
    </section>
  );
}
