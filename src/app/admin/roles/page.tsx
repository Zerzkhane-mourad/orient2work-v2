"use client";

/**
 * Rôles d'administration.
 *
 * ── Création et modification en page ────────────────────────────────────────
 *
 * Elles vivaient dans une modale, trop étroite pour une matrice de six
 * domaines. Elles ont leur écran : `/admin/roles/nouveau` et
 * `/admin/roles/[id]`. La suppression reste ici — c'est une opération de liste,
 * qui se décide en voyant le nombre de comptes rattachés.
 *
 * Le détail des permissions est porté par l'écran de modification, qui les
 * montre cochées dans leur matrice ; la liste s'en tient à ce qui distingue un
 * rôle d'un autre au premier coup d'œil.
 */
import { Suspense, useState } from "react";
import {
  Badge,
  Button,
  ButtonLink,
  ErrorBanner,
  ErrorState,
  Icon,
  Modal,
  PageHeader,
  SkeletonList,
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
  TableEmpty,
  TableSkeleton,
} from "@/features/admin/admin-table";
import { usePermissions } from "@/features/auth/use-permissions";
import { api } from "@/lib/api";
import type { ApiRoleAdmin } from "@/lib/api/types";
import { useApi, useMutation } from "@/lib/api/use-api";
import { useDebounced } from "@/lib/use-debounced";
import { useFiltresUrl } from "@/lib/use-filtres-url";
import { useClampPage, usePageSize, usePagination } from "@/lib/use-pagination";

const PER_PAGE = 20;
const COLUMNS = 4;

/** Constante de module : `useFiltresUrl` la garde comme état de référence. */
const FILTRES = { q: "" };

export default function AdminRolesPage() {
  return (
    <Suspense fallback={<SkeletonList count={4} />}>
      <Contenu />
    </Suspense>
  );
}

function Contenu() {
  const { can } = usePermissions();
  const peutEcrire = can("roles:write");

  const { valeurs, definir, reinitialiser, actifs } = useFiltresUrl(FILTRES);
  const debounced = useDebounced(valeurs.q.trim());

  const { perPage, setPerPage } = usePageSize({ defaultSize: PER_PAGE, storageKey: "admin-roles" });
  const { page, goTo, listRef, clampTo } = usePagination({ perPage, resetOn: [debounced] });

  const { data, loading, error, refetch } = useApi(
    () => api.admin.roles({ q: debounced || undefined, page, perPage }),
    [debounced, page, perPage],
  );

  // Supprimer la dernière entrée d'une page ne doit pas laisser un tableau vide.
  useClampPage(data?.meta, clampTo);

  const [deleting, setDeleting] = useState<ApiRoleAdmin | null>(null);
  const remove = useMutation(api.admin.deleteRole);

  const fermer = () => {
    setDeleting(null);
    remove.reset();
  };

  const roles = data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rôles et permissions"
        subtitle="Définissez ce que chaque profil d'administrateur peut consulter et modifier."
        actions={
          peutEcrire && (
            <ButtonLink href="/admin/roles/nouveau" variant="secondary">
              <Icon name="add" className="text-[18px]" /> Nouveau rôle
            </ButtonLink>
          )
        }
      />

      <AdminFilters
        query={valeurs.q}
        onQueryChange={(valeur) => definir("q", valeur)}
        placeholder="Nom ou description du rôle…"
        onReset={actifs ? reinitialiser : undefined}
      />

      {remove.error && !deleting && <ErrorBanner error={remove.error} />}

      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <div ref={listRef} className="space-y-4">
          <Table>
            <THead>
              <TR>
                <TH>Rôle</TH>
                <TH>Comptes</TH>
                <TH>Nature</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>

            {loading ? (
              <TableSkeleton columns={COLUMNS} />
            ) : roles.length === 0 ? (
              <TableEmpty
                columns={COLUMNS}
                icon="verified_user"
                message={actifs ? "Aucun rôle ne correspond" : "Aucun rôle pour le moment"}
                hint={
                  actifs
                    ? "Élargissez la recherche, ou réinitialisez le filtre."
                    : "Créez-en un pour répartir les droits entre vos administrateurs."
                }
              />
            ) : (
              <TBody>
                {roles.map((role) => {
                  /*
                   * Deux raisons distinctes de refuser la suppression, deux
                   * messages distincts : « impossible » sans dire pourquoi
                   * oblige à essayer pour comprendre.
                   */
                  const raisonBlocage = role.systeme
                    ? "Le rôle système ne peut pas être supprimé"
                    : role.utilisateurs > 0
                      ? `Impossible : ${role.utilisateurs} compte(s) portent ce rôle`
                      : null;

                  return (
                    <TR key={role.id}>
                      <TD>
                        <p className="font-semibold text-primary">{role.nom}</p>
                        {role.description && (
                          <p className="max-w-md text-xs text-on-surface-variant">
                            {role.description}
                          </p>
                        )}
                      </TD>

                      <TD className="text-on-surface-variant tabular-nums">
                        {role.utilisateurs}
                      </TD>

                      <TD>
                        {role.systeme ? (
                          <Badge tone="gold" icon="lock">
                            Système
                          </Badge>
                        ) : (
                          <Badge tone="neutral">Personnalisé</Badge>
                        )}
                      </TD>

                      <TD>
                        <div className="flex justify-end gap-1">
                          <ButtonLink
                            href={`/admin/roles/${role.id}`}
                            variant="ghost"
                            size="sm"
                            aria-label={
                              peutEcrire
                                ? `Modifier ${role.nom}`
                                : `Voir les droits de ${role.nom}`
                            }
                            title={peutEcrire ? "Modifier" : "Voir les droits"}
                          >
                            <Icon
                              name={peutEcrire ? "edit" : "visibility"}
                              className="text-[18px]"
                            />
                          </ButtonLink>
                          {peutEcrire && (
                            <button
                              type="button"
                              disabled={raisonBlocage !== null}
                              onClick={() => {
                                remove.reset();
                                setDeleting(role);
                              }}
                              className="rounded-full p-2 text-error transition-colors hover:bg-error-container disabled:opacity-30"
                              aria-label={`Supprimer ${role.nom}`}
                              title={raisonBlocage ?? "Supprimer"}
                            >
                              <Icon name="delete" className="text-[18px]" />
                            </button>
                          )}
                        </div>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            )}
          </Table>

          {data?.meta && (
            <Pagination
              meta={data.meta}
              onPageChange={goTo}
              onPerPageChange={setPerPage}
              busy={loading}
              unit="rôle"
            />
          )}
        </div>
      )}

      <Modal
        open={deleting !== null}
        onClose={fermer}
        title={`Supprimer « ${deleting?.nom ?? ""} » ?`}
        description="Cette action est irréversible."
        footer={
          <>
            <Button variant="ghost" onClick={fermer}>
              Annuler
            </Button>
            <Button
              variant="danger"
              disabled={remove.pending}
              onClick={() => {
                if (!deleting) return;
                void remove.run(deleting.id).then((fait) => {
                  if (fait !== null) {
                    fermer();
                    refetch();
                  }
                });
              }}
            >
              {remove.pending ? "Suppression…" : "Supprimer"}
            </Button>
          </>
        }
      >
        {remove.error ? (
          <ErrorBanner error={remove.error} />
        ) : (
          <p className="text-sm text-on-surface-variant">
            Aucun compte ne porte ce rôle : sa suppression est sans effet de bord.
          </p>
        )}
      </Modal>
    </div>
  );
}
