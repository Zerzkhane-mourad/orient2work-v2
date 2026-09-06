"use client";

import { useState } from "react";
import {
  ErrorState,
  Icon,
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
import { api } from "@/lib/api";
import type { EntretienStatus } from "@/lib/api/types";
import { useApi } from "@/lib/api/use-api";
import { usePageSize, usePagination } from "@/lib/use-pagination";
import { ENTRETIEN_STATUSES } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

const STATUS_OPTIONS = (
  Object.entries(ENTRETIEN_STATUSES) as [EntretienStatus, { label: string }][]
).map(([value, { label }]) => ({ value, label }));

const PER_PAGE = 20;
const COLUMNS = 5;

export default function AdminEntretiensPage() {
  const [status, setStatus] = useState<EntretienStatus | "">("");
  const { perPage, setPerPage } = usePageSize({
    defaultSize: PER_PAGE,
    storageKey: "admin-entretiens",
  });
  const { page, goTo, listRef } = usePagination({ perPage, resetOn: [status] });

  
  const { data, loading, error, refetch } = useApi(
    () => api.entretiens.list({ status: status || undefined, page, perPage }),
    [status, page, perPage],
  );

  const entretiens = data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suivi des entretiens"
        subtitle="Vue globale des entretiens planifiés sur la plateforme."
      />

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

      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <div ref={listRef} className="space-y-4">
          <Table>
            <THead>
              <TR>
                <TH>Candidat</TH>
                <TH>Entreprise</TH>
                <TH>Poste</TH>
                <TH>Date</TH>
                <TH>Statut</TH>
              </TR>
            </THead>

            {loading ? (
              <TableSkeleton columns={COLUMNS} />
            ) : entretiens.length === 0 ? (
              <TableEmpty
                columns={COLUMNS}
                icon="event_busy"
                message="Aucun entretien ne correspond"
                hint="Choisissez « Tous les statuts » pour voir l'ensemble des rendez-vous."
              />
            ) : (
              <TBody>
                {entretiens.map((e) => (
                  <TR key={e.id}>
                    <TD>
                      <p className="font-semibold text-primary">
                        {e.jeune.prenom} {e.jeune.nom}
                      </p>
                      <p className="text-xs text-on-surface-variant">{e.jeune.titre}</p>
                    </TD>
                    <TD className="text-on-surface-variant">{e.entreprise.nom}</TD>
                    <TD className="text-on-surface-variant">{e.offreTitre}</TD>
                    <TD>
                      <span className="flex items-center gap-1 text-on-surface-variant">
                        <Icon name="event" className="text-[16px]" />
                        {formatDate(e.date)} à {e.heure}
                      </span>
                    </TD>
                    <TD>
                      <StatusBadge kind="entretien" status={e.status} />
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
              unit="entretien"
            />
          )}
        </div>
      )}
    </div>
  );
}
