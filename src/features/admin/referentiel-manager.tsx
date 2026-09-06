"use client";

/**
 * Gestion d'un référentiel administrable (§7.4).
 *
 * Catégories de formation et filières vivaient dans le code : les faire évoluer
 * demandait un redéploiement. Elles sont désormais en base et se gèrent ici.
 *
 * Deux garde-fous côté API, repris dans l'interface :
 *  • une entrée utilisée ne peut pas être supprimée — on propose de la
 *    désactiver, ce qui la retire des listes de choix sans toucher aux
 *    enregistrements existants ;
 *  • renommer se propage partout, puisque les enregistrements pointent sur
 *    l'identifiant et non sur le libellé.
 *
 * L'écran est identique d'un référentiel à l'autre : seuls les libellés changent,
 * ils sont donc passés en configuration plutôt que dupliqués par page.
 */
import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  ErrorBanner,
  ErrorState,
  Icon,
  Input,
  Modal,
  Pagination,
  PageHeader,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui";
import { TableEmpty, TableSkeleton } from "@/features/admin/admin-table";
import { useApi, useMutation } from "@/lib/api/use-api";
import { usePageSize, usePagination, useClampPage } from "@/lib/use-pagination";
import { api } from "@/lib/api";
import type { ApiReferentielEntree, ReferentielKey } from "@/lib/api/types";

import { cn } from "@/lib/utils";

/**
 * Libellés propres à un référentiel.
 *
 * Les deux référentiels actuels ont un nom féminin (« une catégorie », « une
 * filière ») : les formulations ci-dessous s'accordent en conséquence. Un
 * référentiel masculin demanderait d'ajouter le genre à cette configuration.
 */
export interface ReferentielConfig {
  /** Segment d'URL de l'API. */
  cle: ReferentielKey;
  /** Titre de la carte, au pluriel. */
  titre: string;
  /** Nom au singulier, inséré dans les phrases. */
  singulier: string;
  /** En-tête de la colonne des usages. */
  colonneUsages: string;
  /** Ce qui référence une entrée, au pluriel : « les formations ». */
  usagers: string;
  /** Exemple de nom, en placeholder du formulaire de création. */
  exemple: string;
  /** Où l'entrée apparaît une fois créée. */
  portee: string;
}

const PER_PAGE = 20;
const COLUMNS = 5;

export function ReferentielManager({ config }: { config: ReferentielConfig }) {
  const { perPage, setPerPage } = usePageSize({
    defaultSize: PER_PAGE,
    storageKey: `referentiel-${config.cle}`,
  });
  const { page, goTo, listRef, clampTo } = usePagination({ perPage });

  const { data, loading, error, refetch } = useApi(
    () => api.referentiels.liste(config.cle, { inactives: true, page, perPage }),
    [config.cle, page, perPage],
  );

  // Supprimer la dernière entrée d'une page ne doit pas laisser un tableau vide.
  useClampPage(data?.meta, clampTo);

  const entrees: ApiReferentielEntree[] = data?.items ?? [];

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ApiReferentielEntree | null>(null);
  const [deleting, setDeleting] = useState<ApiReferentielEntree | null>(null);
  const [nom, setNom] = useState("");

  const create = useMutation(api.referentiels.creer);
  const update = useMutation(api.referentiels.modifier);
  const remove = useMutation(api.referentiels.supprimer);
  const deplacer = useMutation(api.referentiels.deplacer);

  const pending = create.pending || update.pending || remove.pending || deplacer.pending;
  const actionError = create.error ?? update.error ?? remove.error ?? deplacer.error;

  const closeAll = () => {
    setCreating(false);
    setEditing(null);
    setDeleting(null);
    create.reset();
    update.reset();
    remove.reset();
  };

  const submitCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    const created = await create.run(config.cle, { nom: nom.trim() });
    if (created) {
      closeAll();
      refetch();
    }
  };

  const submitEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    const updated = await update.run(config.cle, editing.id, { nom: nom.trim() });
    if (updated) {
      closeAll();
      refetch();
    }
  };

  const toggleActive = async (entree: ApiReferentielEntree) => {
    const updated = await update.run(config.cle, entree.id, { active: !entree.active });
    if (updated) refetch();
  };

  /**
   * Déplace une entrée d'un cran.
   *
   * Le serveur trouve le voisin et réécrit l'ordre : il connaît la liste
   * entière, alors que l'écran n'en affiche qu'une page.
   */
  const move = async (id: string, direction: "haut" | "bas") => {
    const done = await deplacer.run(config.cle, id, direction);
    if (done !== null) refetch();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Référentiels"
        subtitle="Listes de valeurs utilisées par la plateforme."
        actions={
          <Button
            variant="secondary"
            onClick={() => {
              setNom("");
              create.reset();
              setCreating(true);
            }}
          >
            <Icon name="add" className="text-[18px]" /> Nouvelle {config.singulier}
          </Button>
        }
      />

      {actionError && !creating && !editing && !deleting && <ErrorBanner error={actionError} />}

      <Card>
        <CardHeader>
          <CardTitle>{config.titre}</CardTitle>
          <span className="text-xs text-on-surface-variant">{data?.meta.total ?? 0} entrée(s)</span>
        </CardHeader>
        <CardBody>
          {/* Ancre de défilement : un changement de page ramène ici. */}
          <div ref={listRef} />

          {error ? (
            <ErrorState error={error} onRetry={refetch} />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Ordre</TH>
                  <TH>Nom</TH>
                  <TH>{config.colonneUsages}</TH>
                  <TH>État</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>

              {loading ? (
                <TableSkeleton columns={COLUMNS} />
              ) : entrees.length === 0 ? (
                <TableEmpty
                  columns={COLUMNS}
                  icon="category"
                  message={`Aucune ${config.singulier} pour le moment`}
                  hint={`Créez-en une pour ${config.portee}.`}
                />
              ) : (
                <TBody>
                  {entrees.map((entree, index) => (
                    <TR key={entree.id}>
                      <TD>
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            disabled={pending || (page === 1 && index === 0)}
                            onClick={() => void move(entree.id, "haut")}
                            className="rounded p-1 text-on-surface-variant hover:bg-surface-container disabled:opacity-30"
                            aria-label="Monter"
                            title="Monter"
                          >
                            <Icon name="chevron_right" className="-rotate-90 text-[16px]" />
                          </button>
                          <button
                            type="button"
                            disabled={
                              pending ||
                              (data?.meta.page === data?.meta.totalPages &&
                                index === entrees.length - 1)
                            }
                            onClick={() => void move(entree.id, "bas")}
                            className="rounded p-1 text-on-surface-variant hover:bg-surface-container disabled:opacity-30"
                            aria-label="Descendre"
                            title="Descendre"
                          >
                            <Icon name="chevron_right" className="rotate-90 text-[16px]" />
                          </button>
                        </div>
                      </TD>
                      <TD>
                        <span
                          className={cn(
                            "font-semibold",
                            entree.active ? "text-primary" : "text-on-surface-variant line-through",
                          )}
                        >
                          {entree.nom}
                        </span>
                      </TD>
                      <TD className="text-on-surface-variant">{entree.usages}</TD>
                      <TD>
                        {entree.active ? (
                          <Badge tone="success" icon="check_circle">
                            Active
                          </Badge>
                        ) : (
                          <Badge tone="neutral">Désactivée</Badge>
                        )}
                      </TD>
                      <TD>
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => {
                              setNom(entree.nom);
                              update.reset();
                              setEditing(entree);
                            }}
                            className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container disabled:opacity-40"
                            aria-label={`Renommer ${entree.nom}`}
                            title="Renommer"
                          >
                            <Icon name="edit" className="text-[18px]" />
                          </button>
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => void toggleActive(entree)}
                            className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container disabled:opacity-40"
                            aria-label={
                              entree.active ? `Désactiver ${entree.nom}` : `Réactiver ${entree.nom}`
                            }
                            title={entree.active ? "Désactiver" : "Réactiver"}
                          >
                            <Icon
                              name={entree.active ? "visibility_off" : "visibility"}
                              className="text-[18px]"
                            />
                          </button>
                          <button
                            type="button"
                            disabled={pending || entree.usages > 0}
                            onClick={() => {
                              remove.reset();
                              setDeleting(entree);
                            }}
                            className="rounded-full p-2 text-error hover:bg-error-container disabled:opacity-30"
                            aria-label={`Supprimer ${entree.nom}`}
                            title={
                              entree.usages > 0
                                ? `Impossible : ${config.usagers} utilisent cette ${config.singulier}`
                                : "Supprimer"
                            }
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
          )}

          {data?.meta && (
            <Pagination
              className="pt-4"
              meta={data.meta}
              onPageChange={goTo}
              onPerPageChange={setPerPage}
              busy={loading}
              unit="entrée"
            />
          )}
        </CardBody>
      </Card>

      <Card className="border-dashed">
        <CardBody className="flex items-start gap-3 text-sm text-on-surface-variant">
          <Icon name="info" className="mt-0.5 shrink-0 text-secondary" />
          <div className="space-y-1">
            <p>
              <strong className="text-on-surface">Désactiver</strong> retire la {config.singulier}{" "}
              des listes de choix sans toucher aux enregistrements qui l&apos;utilisent déjà.
            </p>
            <p>
              <strong className="text-on-surface">Supprimer</strong> n&apos;est possible que si
              aucun enregistrement n&apos;y est rattaché.
            </p>
            <p>
              <strong className="text-on-surface">Renommer</strong> se répercute partout :{" "}
              {config.usagers} référencent la {config.singulier}, pas son libellé.
            </p>
          </div>
        </CardBody>
      </Card>

      {/* Création */}
      <Modal
        open={creating}
        onClose={closeAll}
        title={`Nouvelle ${config.singulier}`}
        description={`Elle servira à ${config.portee}.`}
        footer={
          <>
            <Button variant="ghost" onClick={closeAll}>
              Annuler
            </Button>
            <Button
              variant="secondary"
              form="referentiel-create"
              type="submit"
              disabled={pending || nom.trim().length < 2}
            >
              {create.pending ? "Création…" : "Créer"}
            </Button>
          </>
        }
      >
        <form id="referentiel-create" onSubmit={submitCreate} className="space-y-4" noValidate>
          {create.error && <ErrorBanner error={create.error} />}
          <Input
            label="Nom"
            placeholder={config.exemple}
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            error={create.error?.issueFor("nom")}
            hint="2 à 60 caractères, unique."
            required
          />
        </form>
      </Modal>

      {/* Renommage */}
      <Modal
        open={editing !== null}
        onClose={closeAll}
        title={`Renommer « ${editing?.nom ?? ""} »`}
        description={
          (editing?.usages ?? 0) > 0
            ? `${editing?.usages} enregistrement(s) suivront automatiquement le nouveau nom.`
            : `Aucun enregistrement n'utilise encore cette ${config.singulier}.`
        }
        footer={
          <>
            <Button variant="ghost" onClick={closeAll}>
              Annuler
            </Button>
            <Button
              variant="secondary"
              form="referentiel-edit"
              type="submit"
              disabled={pending || nom.trim().length < 2}
            >
              {update.pending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </>
        }
      >
        <form id="referentiel-edit" onSubmit={submitEdit} className="space-y-4" noValidate>
          {update.error && <ErrorBanner error={update.error} />}
          <Input
            label="Nom"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            error={update.error?.issueFor("nom")}
            required
          />
        </form>
      </Modal>

      {/* Suppression */}
      <Modal
        open={deleting !== null}
        onClose={closeAll}
        title={`Supprimer « ${deleting?.nom ?? ""} » ?`}
        description="Cette action est irréversible."
        footer={
          <>
            <Button variant="ghost" onClick={closeAll}>
              Annuler
            </Button>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => {
                if (!deleting) return;
                void remove.run(config.cle, deleting.id).then((done) => {
                  if (done !== null) {
                    closeAll();
                    refetch();
                  }
                });
              }}
            >
              Supprimer
            </Button>
          </>
        }
      >
        {remove.error ? (
          <ErrorBanner error={remove.error} />
        ) : (
          <p className="text-sm text-on-surface-variant">
            Aucun enregistrement n&apos;utilise cette {config.singulier} : sa suppression est sans
            effet de bord.
          </p>
        )}
      </Modal>
    </div>
  );
}
