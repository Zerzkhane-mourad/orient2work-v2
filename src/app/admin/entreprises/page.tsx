"use client";

import { Suspense, useState } from "react";
import {
  Avatar,
  Button,
  ButtonLink,
  ErrorBanner,
  ErrorState,
  Icon,
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
import type { ApiEntreprise, EntrepriseStatus } from "@/lib/api/types";
import { useApi, useMutation } from "@/lib/api/use-api";
import { usePageSize, usePagination } from "@/lib/use-pagination";
import { useDebounced } from "@/lib/use-debounced";
import { useFiltresUrl } from "@/lib/use-filtres-url";
import { ENTREPRISE_STATUSES } from "@/lib/constants";

const STATUS_OPTIONS = (
  Object.entries(ENTREPRISE_STATUSES) as [EntrepriseStatus, { label: string }][]
).map(([value, { label }]) => ({ value, label }));

const PER_PAGE = 20;
const COLUMNS = 6;

/** Constante de module : `useFiltresUrl` la garde comme état de référence. */
const FILTRES = { q: "", status: "" };

/*
 * `useFiltresUrl` lit l'URL, ce qui impose une frontière de suspense : sans
 * elle, la page entière basculerait du rendu statique au rendu dynamique.
 */
export default function AdminEntreprisesPage() {
  return (
    <Suspense fallback={<SkeletonList count={4} />}>
      <Contenu />
    </Suspense>
  );
}

function Contenu() {
  const { valeurs, definir, reinitialiser, actifs } = useFiltresUrl(FILTRES);
  const query = valeurs.q;
  const status = valeurs.status as EntrepriseStatus | "";
  /** Entreprise dont on veut motiver le refus. */
  const [refusing, setRefusing] = useState<ApiEntreprise | null>(null);
  const [motif, setMotif] = useState("");

  // Anti-rebond : sans lui, chaque frappe déclencherait une requête.
  const debounced = useDebounced(query.trim());

  const { perPage, setPerPage } = usePageSize({
    defaultSize: PER_PAGE,
    storageKey: "admin-entreprises",
  });
  const { page, goTo, listRef } = usePagination({ perPage, resetOn: [debounced, status] });

  const { data, loading, error, refetch } = useApi(
    () =>
      api.admin.entreprises({
        q: debounced || undefined,
        status: status || undefined,
        page,
        perPage,
      }),
    [debounced, status, page, perPage],
  );

  const {
    run: setStatusFor,
    pending,
    error: actionError,
  } = useMutation(api.admin.setEntrepriseStatus);

  const apply = async (id: string, next: EntrepriseStatus, reason?: string) => {
    const updated = await setStatusFor(id, next, reason);
    // Le statut conditionne aussi le nombre d'offres publiées : on recharge la
    // page plutôt que de patcher la ligne à la main.
    if (updated) refetch();
  };

  const entreprises = data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestion des entreprises"
        subtitle="Validez, refusez ou suspendez les comptes entreprise."
      />

      <AdminFilters
        query={query}
        onQueryChange={(valeur) => definir("q", valeur)}
        placeholder="Nom, secteur ou description…"
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
                <TH>Entreprise</TH>
                <TH>Secteur</TH>
                <TH>Responsable</TH>
                <TH>Offres</TH>
                <TH>Statut</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>

            {loading ? (
              <TableSkeleton columns={COLUMNS} />
            ) : entreprises.length === 0 ? (
              <TableEmpty
                columns={COLUMNS}
                message="Aucune entreprise ne correspond"
                hint="Élargissez la recherche, ou choisissez « Tous les statuts »."
              />
            ) : (
              <TBody>
                {entreprises.map((e) => (
                  <TR key={e.id}>
                    <TD>
                      <div className="flex items-center gap-3">
                        <Avatar src={e.logo} alt={e.nom} size={36} />
                        <div>
                          <p className="font-semibold text-primary">{e.nom}</p>
                          <p className="text-xs text-on-surface-variant">{e.ville}</p>
                        </div>
                      </div>
                    </TD>
                    <TD className="text-on-surface-variant">{e.secteur}</TD>
                    <TD className="text-on-surface-variant">
                      <p>{e.responsable}</p>
                      <p className="text-xs">{e.emailResponsable}</p>
                    </TD>
                    <TD>{e.offresPubliees}</TD>
                    <TD>
                      <StatusBadge kind="entreprise" status={e.status} />
                    </TD>
                    <TD>
                      <div className="flex justify-end gap-1">
                        <ButtonLink
                          href={`/admin/entreprises/${e.id}`}
                          variant="ghost"
                          size="sm"
                          aria-label={`Voir la fiche de ${e.nom}`}
                          title="Voir la fiche"
                        >
                          <Icon name="visibility" className="text-[18px]" />
                        </ButtonLink>
                        {/* Contour plutôt que plein : voir la note de la liste
                            des jeunes — un aplat d'or répété à chaque ligne
                            écrase la colonne des statuts. */}
                        {e.status !== "valide" && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={pending}
                            onClick={() => void apply(e.id, "valide")}
                          >
                            Valider
                          </Button>
                        )}
                        {e.status !== "refuse" && e.status !== "suspendu" && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={pending}
                            onClick={() => {
                              setMotif("");
                              setRefusing(e);
                            }}
                          >
                            Refuser
                          </Button>
                        )}
                        {e.status === "valide" && (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => void apply(e.id, "suspendu")}
                            className="rounded-full p-2 text-error hover:bg-error-container disabled:opacity-40"
                            aria-label="Suspendre"
                            title="Suspendre"
                          >
                            <Icon name="block" className="text-[18px]" />
                          </button>
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
              unit="entreprise"
            />
          )}
        </div>
      )}

      <Modal
        open={refusing !== null}
        onClose={() => setRefusing(null)}
        title={`Refuser ${refusing?.nom ?? ""}`}
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
                if (refusing) void apply(refusing.id, "refuse", motif.trim() || undefined);
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
          placeholder="Dossier incomplet, activité hors périmètre…"
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
        />
      </Modal>
    </div>
  );
}
