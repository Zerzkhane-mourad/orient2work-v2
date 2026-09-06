"use client";

import { Suspense, useState } from "react";
import {
  Badge,
  Button,
  ButtonLink,
  Icon,
  ErrorBanner,
  ErrorState,
  Modal,
  PageHeader,
  SkeletonList,
  StatusBadge,
  Table,
  TBody,
  TD,
  TH,
  THead,
  Textarea,
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
import type { ApiOffre, OffreStatus } from "@/lib/api/types";
import { useApi, useMutation } from "@/lib/api/use-api";
import { usePageSize, usePagination } from "@/lib/use-pagination";
import { useDebounced } from "@/lib/use-debounced";
import { useFiltresUrl } from "@/lib/use-filtres-url";
import { OFFRE_STATUSES } from "@/lib/constants";
import { echeance } from "@/lib/echeance";
import { formatDate } from "@/lib/utils";

const STATUS_OPTIONS = (Object.entries(OFFRE_STATUSES) as [OffreStatus, { label: string }][]).map(
  ([value, { label }]) => ({ value, label }),
);

const PER_PAGE = 20;
const COLUMNS = 6;

/**
 * Filtres par défaut — la file de modération est le cas d'usage principal, on
 * ouvre donc l'écran dessus. Un lien portant `?status=` ou `?q=` prime.
 */
const FILTRES = { q: "", status: "attente_validation" };

/* Frontière de suspense : `useFiltresUrl` lit l'URL. Voir le hook. */
export default function AdminOffresPage() {
  return (
    <Suspense fallback={<SkeletonList count={4} />}>
      <Contenu />
    </Suspense>
  );
}

function Contenu() {
  const { valeurs, definir, reinitialiser, actifs } = useFiltresUrl(FILTRES);
  const query = valeurs.q;
  const status = valeurs.status as OffreStatus | "";
  const [refusing, setRefusing] = useState<ApiOffre | null>(null);
  const [motif, setMotif] = useState("");

  // Anti-rebond : sans lui, chaque frappe déclencherait une requête.
  const debounced = useDebounced(query.trim());

  const { perPage, setPerPage } = usePageSize({
    defaultSize: PER_PAGE,
    storageKey: "admin-offres",
  });
  const { page, goTo, listRef } = usePagination({ perPage, resetOn: [debounced, status] });

  const { data, loading, error, refetch } = useApi(
    () =>
      api.admin.offres({
        q: debounced || undefined,
        status: status || undefined,
        page,
        perPage,
      }),
    [debounced, status, page, perPage],
  );

  const { run: moderate, pending, error: actionError } = useMutation(api.admin.moderateOffre);

  const apply = async (id: string, next: OffreStatus, reason?: string) => {
    const updated = await moderate(id, next, reason);
    if (updated) refetch();
  };

  const offres = data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Modération des offres"
        subtitle="Publiez, refusez ou désactivez les offres soumises par les entreprises."
      />

      <AdminFilters
        query={query}
        onQueryChange={(valeur) => definir("q", valeur)}
        placeholder="Titre, entreprise, ville…"
        onReset={actifs ? reinitialiser : undefined}
      >
        <StatusFilter
          value={status}
          onChange={(valeur) => definir("status", valeur)}
          options={STATUS_OPTIONS}
          allLabel="Tous les statuts"
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
                <TH>Offre</TH>
                <TH>Entreprise</TH>
                <TH>Type</TH>
                <TH>Date limite</TH>
                <TH>Statut</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>

            {loading ? (
              <TableSkeleton columns={COLUMNS} />
            ) : offres.length === 0 ? (
              <TableEmpty
                columns={COLUMNS}
                message="Aucune offre ne correspond"
                hint="Élargissez la recherche, ou choisissez « Tous les statuts »."
              />
            ) : (
              <TBody>
                {offres.map((o) => (
                  <TR key={o.id}>
                    <TD>
                      <p className="font-semibold text-primary">{o.titre}</p>
                      <p className="text-xs text-on-surface-variant">
                        {o.ville} · {o.filiere}
                      </p>
                    </TD>
                    <TD className="text-on-surface-variant">{o.entreprise.nom}</TD>
                    <TD>{o.type}</TD>
                    {/* La date fait foi, le compte à rebours dit ce qu'elle
                        implique : modérer une offre qui ferme demain n'a plus
                        d'intérêt, et rien ne le signalait. */}
                    <TD className="text-on-surface-variant">
                      <span className="block whitespace-nowrap">{formatDate(o.dateLimite)}</span>
                      <Badge tone={echeance(o.dateLimite).ton} className="mt-1">
                        {echeance(o.dateLimite).label}
                      </Badge>
                    </TD>
                    <TD>
                      <StatusBadge kind="offre" status={o.status} />
                    </TD>
                    <TD>
                      <div className="flex justify-end gap-1">
                        <ButtonLink
                          href={`/admin/offres/${o.id}`}
                          variant="ghost"
                          size="sm"
                          aria-label={`Voir l'offre ${o.titre}`}
                          title="Voir l'offre"
                        >
                          <Icon name="visibility" className="text-[18px]" />
                        </ButtonLink>
                        {o.status !== "publiee" && (
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={pending}
                            onClick={() => void apply(o.id, "publiee")}
                          >
                            Publier
                          </Button>
                        )}
                        {o.status !== "desactivee" && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={pending}
                            onClick={() => {
                              setMotif("");
                              setRefusing(o);
                            }}
                          >
                            Refuser
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
              unit="offre"
            />
          )}
        </div>
      )}

      <Modal
        open={refusing !== null}
        onClose={() => setRefusing(null)}
        title={`Refuser « ${refusing?.titre ?? ""} »`}
        description="Le motif est transmis à l'entreprise dans sa notification."
        footer={
          <>
            <Button variant="ghost" onClick={() => setRefusing(null)}>
              Annuler
            </Button>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => {
                if (refusing) void apply(refusing.id, "desactivee", motif.trim() || undefined);
                setRefusing(null);
              }}
            >
              Confirmer le refus
            </Button>
          </>
        }
      >
        <Textarea
          label="Motif (facultatif)"
          rows={4}
          placeholder="Description incomplète, offre hors périmètre…"
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
        />
      </Modal>
    </div>
  );
}
