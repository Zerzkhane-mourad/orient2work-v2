"use client";

import { useState } from "react";
import {
  Badge,
  Button,
  ButtonLink,
  ErrorBanner,
  ErrorState,
  Icon,
  Modal,
  PageHeader,
  StatusBadge,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui";
import {
  AdminToolbar,
  Pagination,
  StatusFilter,
  TableEmpty,
  TableSkeleton,
} from "@/features/admin/admin-table";
import { ValidationBanner } from "@/features/entreprise/validation-banner";
import { api } from "@/lib/api";
import type { ApiOffre, OffreStatus } from "@/lib/api/types";
import { useApi, useMutation } from "@/lib/api/use-api";
import { useClampPage, usePageSize, usePagination } from "@/lib/use-pagination";
import { OFFRE_STATUSES } from "@/lib/constants";
import { echeance } from "@/lib/echeance";
import { formatDate } from "@/lib/utils";

const STATUS_OPTIONS = (Object.entries(OFFRE_STATUSES) as [OffreStatus, { label: string }][]).map(
  ([value, { label }]) => ({ value, label }),
);

const PER_PAGE = 20;
const COLUMNS = 6;

export default function MesOffresPage() {
  const [status, setStatus] = useState<OffreStatus | "">("");
  const [deactivating, setDeactivating] = useState<ApiOffre | null>(null);
  const { perPage, setPerPage } = usePageSize({
    defaultSize: PER_PAGE,
    storageKey: "entreprise-offres",
  });
  const { page, goTo, listRef, clampTo } = usePagination({ perPage, resetOn: [status] });

  // `mes-offres` renvoie tous les statuts, brouillons compris.
  const { data, loading, error, refetch } = useApi(
    () => api.offres.mine({ status: status || undefined, page, perPage }),
    [status, page, perPage],
  );

  // Supprimer la dernière ligne de la dernière page ne doit pas laisser un
  // tableau vide : on recule d'une page.
  useClampPage(data?.meta, clampTo);

  const { run: remove, pending, error: actionError } = useMutation(api.offres.remove);

  const offres = data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mes offres"
        subtitle="Gérez vos offres publiées, en attente et en brouillon."
        actions={
          <ButtonLink href="/espace-entreprise/publier" variant="secondary">
            <Icon name="add" className="text-[18px]" /> Nouvelle offre
          </ButtonLink>
        }
      />

      <ValidationBanner />

      <AdminToolbar>
        <StatusFilter
          value={status}
          onChange={setStatus}
          options={STATUS_OPTIONS}
          allLabel="Tous les statuts"
        />
        {status && (
          <button
            type="button"
            onClick={() => setStatus("")}
            className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-primary/5 hover:text-primary"
          >
            <Icon name="close" className="text-[18px]" />
            Réinitialiser
          </button>
        )}
      </AdminToolbar>

      {actionError && <ErrorBanner error={actionError} />}

      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <div ref={listRef} className="space-y-4">
          <Table>
            <THead>
              <TR>
                <TH>Titre</TH>
                <TH>Type</TH>
                <TH>Candidatures</TH>
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
                icon="work"
                message="Aucune offre pour le moment"
                hint="Publiez votre première opportunité pour commencer à recevoir des candidatures."
              />
            ) : (
              <TBody>
                {offres.map((o) => (
                  <TR key={o.id}>
                    <TD className="font-semibold text-primary">{o.titre}</TD>
                    <TD>{o.type}</TD>
                    <TD>
                      <span className="flex items-center gap-1">
                        <Icon name="person" className="text-[16px] text-on-surface-variant" />
                        {o.candidatures}
                      </span>
                    </TD>
                    {/*
                      La date SEULE demandait au recruteur de calculer, ligne
                      par ligne, ce qui ferme cette semaine. Elle reste écrite
                      — c'est elle qui fait foi — mais le compte à rebours est
                      posé à côté, et se teinte dès la dernière semaine.
                    */}
                    <TD className="text-on-surface-variant">
                      <span className="block whitespace-nowrap">{formatDate(o.dateLimite)}</span>
                      {(() => {
                        const fin = echeance(o.dateLimite);
                        return (
                          <Badge tone={fin.ton} className="mt-1">
                            {fin.label}
                          </Badge>
                        );
                      })()}
                    </TD>
                    <TD>
                      <StatusBadge kind="offre" status={o.status} />
                    </TD>
                    <TD>
                      <div className="flex justify-end gap-1">
                        <ButtonLink
                          href={`/espace-entreprise/candidatures?offreId=${o.id}`}
                          variant="ghost"
                          size="sm"
                          aria-label="Voir les candidatures"
                        >
                          <Icon name="visibility" className="text-[18px]" />
                        </ButtonLink>
                        {o.status !== "desactivee" && (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => setDeactivating(o)}
                            className="rounded-full p-2 text-error hover:bg-error-container disabled:opacity-40"
                            aria-label="Désactiver"
                            title="Désactiver l'offre"
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
              unit="offre"
            />
          )}
        </div>
      )}

      <Modal
        open={deactivating !== null}
        onClose={() => setDeactivating(null)}
        title="Désactiver cette offre ?"
        description={`« ${deactivating?.titre ?? ""} » ne sera plus visible des candidats.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeactivating(null)}>
              Annuler
            </Button>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => {
                if (deactivating) void remove(deactivating.id).then(() => refetch());
                setDeactivating(null);
              }}
            >
              Désactiver
            </Button>
          </>
        }
      >
        {/* Le backend ne supprime jamais une offre ayant reçu des candidatures :
            elle est désactivée, ce qui préserve l'historique côté candidats. */}
        <p className="text-sm text-on-surface-variant">
          Les candidatures déjà reçues restent consultables, et les candidats gardent la trace de
          leur candidature.
        </p>
      </Modal>
    </div>
  );
}
