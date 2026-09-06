"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Avatar,
  Badge,
  Button,
  ButtonLink,
  Card,
  CardBody,
  Chip,
  EmptyState,
  ErrorBanner,
  ErrorState,
  Icon,
  LoadingState,
  PageHeader,
  Select,
  Pagination,
  SkeletonList,
} from "@/components/ui";
import { StatusFilter } from "@/features/admin/admin-table";
import { Qualification } from "@/features/candidatures/qualification";
import { ProposeEntretienModal } from "@/features/entretiens/propose-entretien-modal";
import { api } from "@/lib/api";
import { openProtectedDocument } from "@/lib/api/media";
import type { CandidatureSort, RecruteurStatus } from "@/lib/api/endpoints/candidatures";
import type { ApiCandidatureRecruteur, CandidatureStatus } from "@/lib/api/types";
import { useApi, useMutation } from "@/lib/api/use-api";
import {
  LIBELLE_ENTREPRISE,
  STATUT_ICONE,
  STATUT_TON,
  transitionsRecruteur,
} from "@/features/candidatures/pipeline";
import { usePageSize, usePagination } from "@/lib/use-pagination";
import { formatDate } from "@/lib/utils";

const PER_PAGE = 20;

/**
 * Ordres proposés au recruteur.
 *
 * Chacun correspond à un chiffre AFFICHÉ sur la carte : trier sur une donnée
 * invisible laisse l'utilisateur incapable de vérifier que le tri a bien eu
 * lieu. « Formations » classe donc sur le total suivi, celui du dénominateur.
 */
const TRIS_RECRUTEUR: ReadonlyArray<{ value: CandidatureSort; label: string }> = [
  { value: "recent", label: "Plus récentes" },
  { value: "score", label: "Meilleur score au test" },
  { value: "formations", label: "Plus de formations" },
];

/**
 * Statuts proposés au FILTRE.
 *
 * Distinct des transitions : le recruteur ne peut pas *poser* « Nouvelle » ni
 * « Retirée », mais il doit pouvoir filtrer dessus — ce sont deux de ses vues
 * les plus utiles.
 */
const FILTRES_STATUT = (
  [
    "envoyee",
    "vue",
    "preselectionnee",
    "entretien",
    "acceptee",
    "refusee",
    "retiree",
  ] as const satisfies readonly CandidatureStatus[]
).map((statut) => ({ value: statut, label: LIBELLE_ENTREPRISE[statut] }));

export default function CandidaturesRecuesPage() {
  // `useSearchParams` impose une frontière Suspense.
  return (
    <Suspense fallback={<LoadingState />}>
      <CandidaturesRecues />
    </Suspense>
  );
}

function CandidaturesRecues() {
  const searchParams = useSearchParams();
  // Permet d'arriver depuis « Mes offres » avec l'offre déjà filtrée.
  const offreId = searchParams.get("offreId") ?? undefined;

  const [status, setStatus] = useState<CandidatureStatus | "">("");
  const [sort, setSort] = useState<CandidatureSort>("recent");
  const [proposing, setProposing] = useState<ApiCandidatureRecruteur | null>(null);

  const { perPage, setPerPage } = usePageSize({
    defaultSize: PER_PAGE,
    storageKey: "entreprise-candidatures",
  });
  // Changer de tri ramène page 1 : rester page 3 après un reclassement
  // afficherait des profils sans rapport avec ce qu'on venait chercher.
  const { page, goTo, listRef } = usePagination({ perPage, resetOn: [status, offreId, sort] });

  const { data, loading, error, refetch } = useApi(
    () => api.candidatures.received({ status: status || undefined, offreId, sort, page, perPage }),
    [status, offreId, sort, page, perPage],
  );

  const {
    run: setStatusFor,
    pending,
    error: actionError,
  } = useMutation(api.candidatures.updateStatus);

  const candidatures = data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Candidatures reçues"
        subtitle={
          offreId
            ? "Candidatures déposées sur cette offre."
            : "Les jeunes ayant manifesté leur intérêt pour vos offres."
        }
        actions={
          offreId ? (
            <ButtonLink href="/espace-entreprise/candidatures" variant="ghost" size="sm">
              Voir toutes les candidatures
            </ButtonLink>
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <StatusFilter
          value={status}
          onChange={setStatus}
          options={FILTRES_STATUT}
          allLabel="Tous les statuts"
        />
        <Select
          size="sm"
          label="Trier par"
          value={sort}
          onChange={(v) => setSort(v as CandidatureSort)}
          options={TRIS_RECRUTEUR.map((t) => ({ value: t.value, label: t.label }))}
        />
      </div>

      {actionError && <ErrorBanner error={actionError} />}

      {loading ? (
        <SkeletonList count={3} />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : candidatures.length === 0 ? (
        <EmptyState
          icon="inbox"
          title="Aucune candidature"
          description="Publiez des offres pour recevoir des candidatures de talents validés."
        />
      ) : (
        <div ref={listRef} className="space-y-4">
          {candidatures.map((c) => (
            <Card key={c.id}>
              <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <Avatar src={c.jeune.photo} alt={`${c.jeune.prenom} ${c.jeune.nom}`} size={56} />

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {/*
                      Titre de niveau 2, et non un lien en gras.

                      La page n'avait qu'un `h1` — celui de `PageHeader` — puis
                      plus rien : au clavier, la commande « titre suivant » d'un
                      lecteur d'écran sautait les vingt candidats d'un bloc. Le
                      nom EST le titre de sa carte.
                    */}
                    <h2 className="font-bold">
                      <Link
                        href={`/espace-entreprise/talents/${c.jeune.id}`}
                        className="text-primary hover:underline"
                      >
                        {c.jeune.prenom} {c.jeune.nom}
                      </Link>
                    </h2>
                    {c.status === "envoyee" && <Badge tone="gold">Nouveau</Badge>}
                    <Badge tone={STATUT_TON[c.status]} icon={STATUT_ICONE[c.status]}>
                      {LIBELLE_ENTREPRISE[c.status]}
                    </Badge>
                  </div>

                  <p className="text-sm text-on-surface-variant">
                    A candidaté à <span className="font-semibold">{c.offre.titre}</span> •{" "}
                    {formatDate(c.createdAt)}
                  </p>

                  {c.message && (
                    <p className="rounded-lg bg-surface-container-low px-3 py-2 text-sm text-on-surface">
                      « {c.message} »
                    </p>
                  )}

                  {/* Les deux signaux de qualification, AVANT les compétences :
                      ils décident si l'on ouvre le profil. */}
                  <Qualification
                    {...(typeof c.jeune.scoreQuiz === "number"
                      ? { scoreQuiz: c.jeune.scoreQuiz }
                      : {})}
                    formationsValidees={c.jeune.formationsValidees}
                    formationsSuivies={c.jeune.formationsSuivies}
                  />

                  <div className="flex flex-wrap gap-1.5">
                    {c.jeune.competences.slice(0, 5).map((comp) => (
                      <Chip key={comp} className="text-xs">
                        {comp}
                      </Chip>
                    ))}
                  </div>
                </div>

                <div className="flex w-full shrink-0 flex-col gap-2 sm:w-48">
                  {/* Le CV n'est accessible que parce qu'il a été joint à CETTE
                      candidature — le backend refuse tout autre accès. */}
                  {c.cv ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const cv = c.cv;
                        if (cv) {
                          void openProtectedDocument(
                            `/api/v1/documents/${cv.id}/contenu`,
                            cv.filename,
                          );
                        }
                      }}
                    >
                      <Icon name="download" className="text-[16px]" /> CV
                    </Button>
                  ) : (
                    <p className="text-center text-xs text-on-surface-variant">Aucun CV joint</p>
                  )}

                  <Button variant="secondary" size="sm" onClick={() => setProposing(c)}>
                    <Icon name="event" className="text-[16px]" /> Entretien
                  </Button>

                  <Select
                    size="sm"
                    aria-label="Changer le statut de la candidature"
                    value={c.status}
                    disabled={pending}
                    onChange={(next) => {
                      void setStatusFor(c.id, next as RecruteurStatus).then((updated) => {
                        if (updated) refetch();
                      });
                    }}
                    /*
                      Seules les transitions ATTEIGNABLES depuis l'état courant.
                      Le menu les proposait toutes : on pouvait choisir « Vue »
                      sur une candidature acceptée, ou statuer sur une
                      candidature retirée — l'API répond 409 dans les deux cas.
                      L'état courant figure en tête, désactivé, pour rester lisible.
                    */
                    options={[
                      {
                        value: c.status,
                        label: LIBELLE_ENTREPRISE[c.status],
                        isDisabled: true,
                      },
                      ...transitionsRecruteur(c.status).map((statut) => ({
                        value: statut,
                        label: LIBELLE_ENTREPRISE[statut],
                      })),
                    ]}
                  />
                </div>
              </CardBody>
            </Card>
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

      {proposing && (
        <ProposeEntretienModal
          open
          onClose={() => setProposing(null)}
          jeuneId={proposing.jeune.id}
          jeuneNom={`${proposing.jeune.prenom} ${proposing.jeune.nom}`}
          offreTitre={proposing.offre.titre}
          offreId={proposing.offre.id}
          candidatureId={proposing.id}
        />
      )}
    </div>
  );
}
