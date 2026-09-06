"use client";

import { Suspense } from "react";
import {
  Avatar,
  Button,
  ButtonLink,
  ErrorBanner,
  ErrorState,
  Icon,
  PageHeader,
  Select,
  SkeletonList,
  StatusBadge,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui";
import {
  AdminFilters,
  Pagination,
  StatusFilter,
  TableEmpty,
  TableSkeleton,
} from "@/features/admin/admin-table";
import { api } from "@/lib/api";
import type { JeuneStatus } from "@/lib/api/types";
import { useApi, useMutation } from "@/lib/api/use-api";
import { usePageSize, usePagination } from "@/lib/use-pagination";
import { useDebounced } from "@/lib/use-debounced";
import { useFiltresUrl } from "@/lib/use-filtres-url";
import { JEUNE_STATUSES } from "@/lib/constants";
import { useFilieres } from "@/features/admin/use-referentiel";

const STATUS_OPTIONS = (Object.entries(JEUNE_STATUSES) as [JeuneStatus, { label: string }][]).map(
  ([value, { label }]) => ({ value, label }),
);

const PER_PAGE = 20;
const COLUMNS = 6;

/**
 * Filtres par défaut. `filiereId` porte l'IDENTIFIANT et non le libellé :
 * renommer une filière ne doit pas vider la liste — ni casser un lien partagé.
 */
const FILTRES = { q: "", status: "", filiereId: "" };

/* Frontière de suspense : `useFiltresUrl` lit l'URL. Voir le hook. */
export default function AdminJeunesPage() {
  return (
    <Suspense fallback={<SkeletonList count={4} />}>
      <Contenu />
    </Suspense>
  );
}

function Contenu() {
  const { filieres } = useFilieres();
  const { valeurs, definir, reinitialiser, actifs } = useFiltresUrl(FILTRES);
  const query = valeurs.q;
  const status = valeurs.status as JeuneStatus | "";
  const filiereId = valeurs.filiereId;

  // Anti-rebond : sans lui, chaque frappe déclencherait une requête.
  const debounced = useDebounced(query.trim());


  // `resetOn` ramène page 1 dès qu'un filtre bouge : plus besoin d'un `setPage(1)`
  // sur chaque contrôle, ni de risquer de l'oublier sur le prochain ajouté.
  const { perPage, setPerPage } = usePageSize({
    defaultSize: PER_PAGE,
    storageKey: "admin-jeunes",
  });
  const { page, goTo, listRef } = usePagination({
    perPage,
    resetOn: [debounced, status, filiereId],
  });

  const { data, loading, error, refetch } = useApi(
    () =>
      api.admin.jeunes({
        q: debounced || undefined,
        status: status || undefined,
        filiereId: filiereId || undefined,
        page,
        perPage,
      }),
    [debounced, status, filiereId, page, perPage],
  );

  const { run: setStatusFor, pending, error: actionError } = useMutation(api.admin.setJeuneStatus);

  const apply = async (id: string, next: JeuneStatus) => {
    const updated = await setStatusFor(id, next);
    if (updated) refetch();
  };

  const jeunes = data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestion des jeunes"
        subtitle={data?.meta ? `${data.meta.total} compte(s) jeune(s) inscrit(s).` : "Chargement…"}
      />

      <AdminFilters
        query={query}
        onQueryChange={(valeur) => definir("q", valeur)}
        placeholder="Nom, titre, compétence…"
        onReset={actifs ? reinitialiser : undefined}
      >
        <StatusFilter
          value={status}
          onChange={(valeur) => definir("status", valeur)}
          options={STATUS_OPTIONS}
          allLabel="Tous les statuts"
        />
        {/* La valeur est l'identifiant, le libellé n'est qu'un affichage. */}
        <Select
          size="sm"
          className="min-w-44"
          aria-label="Filtrer par filière"
          value={filiereId}
          onChange={(valeur) => definir("filiereId", valeur)}
          options={[
            { value: "", label: "Toutes les filières" },
            ...filieres.map((f) => ({ value: f.id, label: f.nom })),
          ]}
        />
      </AdminFilters>

      {actionError && <ErrorBanner error={actionError} />}

      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <div ref={listRef} className="space-y-4">
          <Table>
            <THead>
              <TR>
                <TH>Nom</TH>
                <TH>Filière</TH>
                <TH>Score test</TH>
                <TH>Profil</TH>
                <TH>Statut</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>

            {loading ? (
              <TableSkeleton columns={COLUMNS} />
            ) : jeunes.length === 0 ? (
              <TableEmpty
                columns={COLUMNS}
                message="Aucun jeune ne correspond"
                hint="Élargissez la recherche, ou retirez le filtre de statut ou de filière."
              />
            ) : (
              <TBody>
                {jeunes.map((j) => (
                  <TR key={j.id}>
                    <TD>
                      <div className="flex items-center gap-3">
                        <Avatar src={j.photo} alt={`${j.prenom} ${j.nom}`} size={36} />
                        <div>
                          <p className="font-semibold text-primary">
                            {j.prenom} {j.nom}
                          </p>
                          <p className="text-xs text-on-surface-variant">{j.email}</p>
                        </div>
                      </div>
                    </TD>
                    <TD className="text-on-surface-variant">{j.filiere || "—"}</TD>
                    <TD>{typeof j.scoreQuiz === "number" ? `${j.scoreQuiz}%` : "—"}</TD>
                    <TD className="text-on-surface-variant">{j.profilCompletion}%</TD>
                    <TD>
                      <StatusBadge kind="jeune" status={j.status} />
                    </TD>
                    <TD>
                      <div className="flex justify-end gap-1">
                        <ButtonLink
                          href={`/admin/jeunes/${j.id}`}
                          variant="ghost"
                          size="sm"
                          aria-label={`Voir la fiche de ${j.prenom} ${j.nom}`}
                          title="Voir la fiche"
                        >
                          <Icon name="visibility" className="text-[18px]" />
                        </ButtonLink>
                        {/*
                          La validation manuelle reste possible : elle sert aux
                          cas traités hors ligne par l'équipe OMB.

                          En `outline` et non en `secondary` : rempli d'or, ce
                          bouton se répétait sur vingt lignes et faisait de la
                          page un mur jaune où plus rien ne ressortait — surtout
                          pas les statuts, qui sont pourtant ce qu'on vient y
                          lire. Le contour garde l'action évidente et rend son
                          poids visuel à la colonne « statut ».
                        */}
                        {j.status !== "valide" && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={pending}
                            onClick={() => void apply(j.id, "valide")}
                          >
                            Valider
                          </Button>
                        )}
                        {j.status !== "suspendu" ? (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => void apply(j.id, "suspendu")}
                            className="rounded-full p-2 text-error hover:bg-error-container disabled:opacity-40"
                            aria-label="Suspendre"
                            title="Suspendre"
                          >
                            <Icon name="block" className="text-[18px]" />
                          </button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={pending}
                            onClick={() => void apply(j.id, "inscrit")}
                          >
                            Réactiver
                          </Button>
                        )}
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            )}
          </Table>

          {data?.meta && (
            <Pagination
              meta={data.meta}
              onPageChange={goTo}
              onPerPageChange={setPerPage}
              busy={loading}
              unit="jeune"
            />
          )}
        </div>
      )}
    </div>
  );
}
