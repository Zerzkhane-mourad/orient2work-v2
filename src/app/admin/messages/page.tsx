"use client";

import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  ErrorBanner,
  ErrorState,
  Icon,
  PageHeader,
  SkeletonList,
} from "@/components/ui";
import { AdminToolbar, FiltrePastilles, Pagination } from "@/features/admin/admin-table";
import { api } from "@/lib/api";
import { formatRelative } from "@/lib/api/adapters";
import { useApi, useMutation } from "@/lib/api/use-api";
import { usePageSize, usePagination } from "@/lib/use-pagination";
import { cn } from "@/lib/utils";

const PER_PAGE = 20;

const TABS = [
  { key: "a-traiter", label: "À traiter", traite: false },
  { key: "traites", label: "Traités", traite: true },
  { key: "tous", label: "Tous", traite: undefined },
] as const;

export default function AdminMessagesPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("a-traiter");

  const traite = TABS.find((t) => t.key === tab)?.traite;

  const { perPage, setPerPage } = usePageSize({
    defaultSize: PER_PAGE,
    storageKey: "admin-messages",
  });
  const { page, goTo, listRef } = usePagination({ perPage, resetOn: [tab] });

  const { data, loading, error, refetch } = useApi(
    () => api.contact.messages({ traite, page, perPage }),
    // `traite` plutôt que `tab` : c'est lui qui part dans la requête, et il
    // en dérive entièrement (un onglet = un état de traitement).
    [traite, page, perPage],
  );
  const abonnes = useApi(() => api.contact.subscriptions({ perPage: 1 }), []);

  const { run: setTraite, pending, error: actionError } = useMutation(api.contact.setTraite);

  const messages = data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Messages reçus"
        subtitle="Demandes envoyées depuis le formulaire de contact public."
        actions={
          <span className="flex items-center gap-2 rounded-full bg-surface-container px-4 py-2 text-sm text-on-surface-variant">
            <Icon name="mail" className="text-[18px]" />
            {abonnes.data?.meta.total ?? 0} abonné(s) newsletter
          </span>
        }
      />

      <AdminToolbar>
        <FiltrePastilles
          label="Filtrer les messages"
          value={tab}
          onChange={setTab}
          options={TABS.map((t) => ({ value: t.key, label: t.label }))}
        />
      </AdminToolbar>

      {actionError && <ErrorBanner error={actionError} />}

      {loading ? (
        <SkeletonList count={3} />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : messages.length === 0 ? (
        <EmptyState icon="inbox" title="Aucun message dans cette catégorie" />
      ) : (
        <div ref={listRef} className="space-y-4">
          <div className="space-y-3">
            {messages.map((m) => (
              <Card key={m.id} className={cn(!m.traite && "border-secondary")}>
                <CardBody className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-primary">{m.sujet}</h3>
                        {m.traite ? (
                          <Badge tone="success" icon="check_circle">
                            Traité
                          </Badge>
                        ) : (
                          <Badge tone="gold">À traiter</Badge>
                        )}
                      </div>
                      <p className="text-sm text-on-surface-variant">
                        {m.nom} ·{" "}
                        <a
                          href={`mailto:${m.email}`}
                          className="hover:text-primary hover:underline"
                        >
                          {m.email}
                        </a>{" "}
                        · {formatRelative(m.createdAt)}
                      </p>
                    </div>
                    <Button
                      variant={m.traite ? "ghost" : "secondary"}
                      size="sm"
                      disabled={pending}
                      onClick={() => {
                        void setTraite(m.id, !m.traite).then((updated) => {
                          if (updated) refetch();
                        });
                      }}
                    >
                      {m.traite ? "Rouvrir" : "Marquer comme traité"}
                    </Button>
                  </div>

                  {/* Contenu assaini côté serveur avant persistance : aucun HTML
                      ne subsiste, l'affichage brut est donc sans risque. */}
                  <p className="whitespace-pre-line rounded-lg bg-surface-container-low px-4 py-3 text-sm text-on-surface">
                    {m.message}
                  </p>
                </CardBody>
              </Card>
            ))}
          </div>

          {data?.meta && (
            <Pagination
              meta={data.meta}
              onPageChange={goTo}
              onPerPageChange={setPerPage}
              busy={loading}
              unit="message"
            />
          )}
        </div>
      )}
    </div>
  );
}
