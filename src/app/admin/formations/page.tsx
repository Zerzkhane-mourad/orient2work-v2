"use client";

import { useState } from "react";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  CardBody,
  ErrorBanner,
  ErrorState,
  Icon,
  Modal,
  PageHeader,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui";
import {
  AdminToolbar,
  FiltrePastilles,
  Pagination,
  TableEmpty,
  TableSkeleton,
} from "@/features/admin/admin-table";
import { api } from "@/lib/api";
import type { ApiFormationSummary } from "@/lib/api/types";
import { useApi, useMutation } from "@/lib/api/use-api";
import { useClampPage, usePageSize, usePagination } from "@/lib/use-pagination";
import { useCategories } from "@/features/admin/use-referentiel";

/** Onglet « tout le catalogue » : aucun filtre, donc pas d'identifiant. */
const TOUTES = "";

const PER_PAGE = 20;
const COLUMNS = 6;

export default function AdminFormationsPage() {
  // Le filtre retient l'IDENTIFIANT de la catégorie, pas son libellé : renommer
  // une entrée depuis les référentiels ne doit pas vider la liste.
  const [categorieId, setCategorieId] = useState<string>(TOUTES);
  const [deleting, setDeleting] = useState<ApiFormationSummary | null>(null);

  // Filtres alimentés par le référentiel administrable (§7.4). Vue admin : les
  // catégories désactivées restent proposées, des formations y sont rattachées.
  const { categories } = useCategories("admin");
  const filtres = [{ id: TOUTES, nom: "Toutes" }, ...categories];

  const { perPage, setPerPage } = usePageSize({
    defaultSize: PER_PAGE,
    storageKey: "admin-formations",
  });
  const { page, goTo, listRef, clampTo } = usePagination({ perPage, resetOn: [categorieId] });

  // En tant qu'admin, la liste inclut aussi les brouillons (`publiee: false`).
  const { data, loading, error, refetch } = useApi(
    () =>
      api.formations.list({
        categorieId: categorieId || undefined,
        page,
        perPage,
      }),
    [categorieId, page, perPage],
  );

  // Supprimer la dernière ligne de la dernière page ne doit pas laisser un
  // tableau vide : on recule d'une page.
  useClampPage(data?.meta, clampTo);

  const { run: remove, pending, error: actionError } = useMutation(api.admin.deleteFormation);

  const formations = data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestion des formations"
        subtitle="Ajoutez et organisez le catalogue de formations."
        actions={
          <ButtonLink href="/admin/formations/nouvelle" variant="secondary">
            <Icon name="add" className="text-[18px]" /> Nouvelle formation
          </ButtonLink>
        }
      />

      <AdminToolbar>
        <FiltrePastilles
          label="Filtrer par catégorie"
          value={categorieId}
          onChange={setCategorieId}
          options={filtres.map((cat) => ({ value: cat.id, label: cat.nom }))}
        />
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
                <TH>Catégorie</TH>
                <TH>Durée</TH>
                <TH>Chapitres</TH>
                <TH>Certifiante</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>

            {loading ? (
              <TableSkeleton columns={COLUMNS} />
            ) : formations.length === 0 ? (
              <TableEmpty
                columns={COLUMNS}
                icon="menu_book"
                message="Aucune formation dans cette catégorie"
                hint="Choisissez « Toutes », ou créez la première formation de la catégorie."
              />
            ) : (
              <TBody>
                {formations.map((f) => (
                  <TR key={f.id}>
                    <TD>
                      <p className="font-semibold text-primary">{f.titre}</p>
                    </TD>
                    <TD>
                      <Badge tone="gold">{f.categorie}</Badge>
                    </TD>
                    <TD className="text-on-surface-variant">{f.tempsLectureMin} min</TD>
                    <TD className="text-on-surface-variant">{f.nombreChapitres}</TD>
                    <TD>
                      {f.certifiante ? (
                        <Icon name="check_circle" filled className="text-success" />
                      ) : (
                        <Icon name="remove" className="text-on-surface-variant" />
                      )}
                    </TD>
                    <TD>
                      <div className="flex justify-end gap-1">
                        <ButtonLink
                          href={`/admin/formations/${f.id}/apercu`}
                          variant="ghost"
                          size="sm"
                          aria-label={`Voir « ${f.titre} »`}
                          title="Voir la formation"
                        >
                          <Icon name="visibility" className="text-[18px]" />
                        </ButtonLink>
                        <ButtonLink
                          href={`/admin/formations/${f.id}`}
                          variant="ghost"
                          size="sm"
                          aria-label={`Modifier « ${f.titre} »`}
                          title="Modifier"
                        >
                          <Icon name="edit" className="text-[18px]" />
                        </ButtonLink>
                        <button
                          type="button"
                          onClick={() => setDeleting(f)}
                          disabled={pending}
                          className="rounded-full p-2 text-error hover:bg-error-container disabled:opacity-40"
                          aria-label="Supprimer"
                        >
                          <Icon name="delete" className="text-[18px]" />
                        </button>
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
              unit="formation"
            />
          )}
        </div>
      )}

      <Card>
        <CardBody className="flex items-center gap-3 text-sm text-on-surface-variant">
          <Icon name="info" className="text-secondary" />
          Le contenu est rédigé en texte enrichi ; chaque titre H2 devient un chapitre pour le
          jeune. Le HTML est assaini par le serveur avant enregistrement.
        </CardBody>
      </Card>

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Supprimer cette formation ?"
        description={`« ${deleting?.titre ?? ""} » sera définitivement supprimée, ainsi que les progressions et avis associés.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              Annuler
            </Button>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => {
                if (deleting) void remove(deleting.id).then(() => refetch());
                setDeleting(null);
              }}
            >
              Supprimer
            </Button>
          </>
        }
      >
        <p className="text-sm text-on-surface-variant">Cette action est irréversible.</p>
      </Modal>
    </div>
  );
}
