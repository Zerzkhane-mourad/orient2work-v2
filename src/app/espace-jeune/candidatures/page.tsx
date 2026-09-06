"use client";

/**
 * Mes candidatures (espace jeune).
 *
 * L'écran répondait à « où en sont mes dossiers ». Il répond maintenant d'abord
 * à « qu'est-ce qui m'attend » : une invitation à un entretien reçoit une
 * bannière et un bouton, au lieu de se fondre dans la liste sous forme d'un
 * simple libellé de statut.
 *
 * La liste est paginée par l'API : les regroupements d'onglets sont donc des
 * FILTRES SERVEUR, jamais un `filter()` sur la page courante, et les compteurs
 * viennent d'un `groupBy` dédié.
 */
import { useState } from "react";
import {
  ButtonLink,
  Card,
  CardBody,
  EmptyState,
  ErrorState,
  Icon,
  PageHeader,
  Pagination,
  ScrollRow,
  SkeletonList,
} from "@/components/ui";
import { LigneCandidature } from "@/features/candidatures/ligne-candidature";
import { api } from "@/lib/api";
import type { CandidatureStatus } from "@/lib/api/types";
import { useApi } from "@/lib/api/use-api";
import { usePageSize, usePagination } from "@/lib/use-pagination";
import { cn } from "@/lib/utils";

const PER_PAGE = 10;

const EN_COURS = ["envoyee", "vue", "preselectionnee"] as const;
const ENTRETIENS = ["entretien", "acceptee"] as const;

const TOUS_STATUTS = [
  "envoyee",
  "vue",
  "preselectionnee",
  "entretien",
  "acceptee",
  "refusee",
  "retiree",
] as const;

/**
 * Onglets et leur traduction en filtre serveur.
 *
 * `statuts: undefined` = aucun filtre, donc tout.
 */
const tabs = [
  { key: "toutes", label: "Toutes", statuts: undefined },
  { key: "encours", label: "En cours", statuts: EN_COURS },
  { key: "entretien", label: "Entretiens", statuts: ENTRETIENS },
  { key: "refusee", label: "Non retenues", statuts: ["refusee", "retiree"] },
] as const satisfies readonly {
  key: string;
  label: string;
  statuts?: readonly CandidatureStatus[];
}[];

export default function MesCandidaturesPage() {
  const [tab, setTab] = useState<(typeof tabs)[number]["key"]>("toutes");

  const statuts = tabs.find((t) => t.key === tab)?.statuts;

  // Changer d'onglet remet en page 1 : rester page 3 sur un onglet qui n'en a
  // qu'une afficherait un écran vide.
  const { perPage, setPerPage } = usePageSize({
    defaultSize: PER_PAGE,
    storageKey: "jeune-candidatures",
  });
  const { page, goTo, listRef } = usePagination({ perPage, resetOn: [tab] });

  const { data, loading, error, refetch } = useApi(
    () => api.candidatures.mine({ status: statuts, page, perPage }),
    // `statuts` plutôt que `tab` : constante de module propre à chaque onglet,
    // donc stable d'un rendu à l'autre, et c'est elle que la requête envoie.
    [statuts, page, perPage],
  );

  // Les compteurs portent sur la TOTALITÉ, la liste sur une page : ils viennent
  // donc d'un `groupBy` côté serveur, et non d'un décompte de ce qui est affiché.
  const compteurs = useApi(() => api.candidatures.countMine(), []);

  const parStatut = compteurs.data ?? {};
  const somme = (...cles: readonly CandidatureStatus[]) =>
    cles.reduce((total, cle) => total + (parStatut[cle] ?? 0), 0);

  const compteOnglet = (statuts?: readonly CandidatureStatus[]) =>
    somme(...(statuts ?? TOUS_STATUTS));

  const visibles = data?.items ?? [];
  const enCours = somme(...EN_COURS);
  const invitations = somme("entretien");
  const acceptees = somme("acceptee");
  // Une candidature retirée n'a jamais été soumise au jugement : la compter
  // ferait baisser le taux de réponse sans qu'aucune entreprise soit en cause.
  const envoyees = somme(...TOUS_STATUTS.filter((s) => s !== "retiree"));
  const traitees = somme("vue", "preselectionnee", "entretien", "acceptee", "refusee");
  const tauxReponse = envoyees > 0 ? Math.round((traitees / envoyees) * 100) : 0;

  const rechargerTout = () => {
    refetch();
    compteurs.refetch();
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <PageHeader
        size="sm"
        title="Mes candidatures"
        subtitle="Suivez l'avancement de chaque candidature."
      />

      {/*
        Bannière d'appel : une invitation à un entretien n'attend pas d'être
        retrouvée au fil d'une liste paginée — elle peut se trouver page 3, et
        un créneau non confirmé peut être repris par un autre candidat.
      */}
      {!compteurs.loading && invitations > 0 && (
        <Card className="border-l-4 border-l-secondary">
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Icon name="event_available" className="text-secondary" />
              {invitations === 1
                ? "Une entreprise vous propose un entretien."
                : `${invitations} entreprises vous proposent un entretien.`}
            </p>
            <ButtonLink href="/espace-jeune/entretiens" variant="secondary" size="sm">
              Répondre
            </ButtonLink>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Chiffre label="Envoyées" valeur={envoyees} loading={compteurs.loading} />
          <Chiffre label="En cours" valeur={enCours} loading={compteurs.loading} />
          <Chiffre label="Acceptées" valeur={acceptees} loading={compteurs.loading} accent />
          <Chiffre
            label="Taux de réponse"
            valeur={tauxReponse}
            suffixe="%"
            loading={compteurs.loading}
            aide={
              envoyees > 0
                ? `${traitees} de vos ${envoyees} candidatures ont été traitées.`
                : undefined
            }
          />
        </CardBody>
      </Card>

      {/* Compteurs dans les onglets : on sait ce qu'on va trouver avant de
          cliquer, et un onglet vide ne se découvre plus après coup. */}
      <ScrollRow aria-label="Filtrer par statut" activeKey={tab}>
        {tabs.map((t) => {
          const compte = compteOnglet(t.statuts);
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              aria-current={tab === t.key ? "true" : undefined}
              data-active={tab === t.key ? "true" : undefined}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-colors",
                tab === t.key
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high",
              )}
            >
              {t.label}
              {!compteurs.loading && (
                <span
                  className={cn(
                    "rounded-full px-1.5 text-xs tabular-nums",
                    tab === t.key ? "bg-white/20" : "bg-surface-container-highest",
                  )}
                >
                  {compte}
                </span>
              )}
            </button>
          );
        })}
      </ScrollRow>

      {loading ? (
        <SkeletonList count={3} />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : visibles.length === 0 ? (
        <EmptyState
          icon="send"
          title={
            tab === "toutes"
              ? "Vous n'avez pas encore postulé"
              : "Aucune candidature dans cette catégorie"
          }
          description={
            tab === "toutes"
              ? "Parcourez les offres et postulez à celles qui vous correspondent."
              : "Changez d'onglet pour retrouver vos autres candidatures."
          }
          action={
            tab === "toutes" ? (
              <ButtonLink href="/espace-jeune/offres" variant="secondary">
                Voir les offres
              </ButtonLink>
            ) : undefined
          }
        />
      ) : (
        <div ref={listRef} className="space-y-3">
          {visibles.map((candidature) => (
            <LigneCandidature
              key={candidature.id}
              candidature={candidature}
              // Un retrait change à la fois la ligne et les compteurs d'onglets.
              onChanged={rechargerTout}
            />
          ))}

          {data?.meta && (
            <Pagination
              meta={data.meta}
              onPageChange={goTo}
              onPerPageChange={setPerPage}
              busy={loading}
              unit="candidature"
            />
          )}
        </div>
      )}
    </div>
  );
}

function Chiffre({
  label,
  valeur,
  suffixe,
  loading,
  accent,
  aide,
}: {
  label: string;
  valeur: number;
  suffixe?: string;
  loading: boolean;
  accent?: boolean;
  /** Infobulle : d'où sort le chiffre, quand il est calculé. */
  aide?: string;
}) {
  return (
    <div className="rounded-lg bg-surface-container-low px-3 py-2.5" title={aide}>
      <p
        className={cn(
          "font-headline text-2xl font-bold leading-tight",
          accent ? "text-secondary" : "text-primary",
        )}
      >
        {loading ? "—" : `${valeur}${suffixe ?? ""}`}
      </p>
      <p className="text-xs text-on-surface-variant">{label}</p>
    </div>
  );
}
