"use client";

/**
 * Tests de validation des comptes jeunes (§5.3).
 *
 * Un test décide de la validation d'un compte. Il y en a UN par filière, plus
 * un test commun servi aux candidats dont la filière n'a pas le sien — c'est
 * cette unicité qui rend prévisible l'épreuve que passe un candidat.
 *
 * L'écran liste les tests, pas les questions : une question appartient toujours
 * à un test, et se gère depuis sa fiche.
 */
import { useState } from "react";
import Link from "next/link";
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
  Pagination,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui";
import { TableEmpty, TableSkeleton } from "@/features/admin/admin-table";
import { api } from "@/lib/api";
import type { ApiTest } from "@/lib/api/types";
import { useApi, useMutation } from "@/lib/api/use-api";
import { useClampPage, usePageSize, usePagination } from "@/lib/use-pagination";
import { QUIZ_MIN_QUESTIONS, QUIZ_PASS_SCORE } from "@/lib/constants";

const PER_PAGE = 20;
const COLUMNS = 5;

export default function AdminTestsPage() {
  const [deleting, setDeleting] = useState<ApiTest | null>(null);

  const { perPage, setPerPage } = usePageSize({ defaultSize: PER_PAGE, storageKey: "admin-tests" });
  const { page, goTo, listRef, clampTo } = usePagination({ perPage });

  const { data, loading, error, refetch } = useApi(
    () => api.admin.tests({ page, perPage }),
    [page, perPage],
  );

  // Supprimer le dernier test d'une page ne doit pas laisser un tableau vide.
  useClampPage(data?.meta, clampTo);

  const modifier = useMutation(api.admin.updateTest);
  const supprimer = useMutation(api.admin.deleteTest);

  const pending = modifier.pending || supprimer.pending;
  const tests = data?.items ?? [];

  const basculerActive = async (test: ApiTest) => {
    const done = await modifier.run(test.id, { active: !test.active });
    if (done) refetch();
  };

  const confirmerSuppression = async () => {
    if (!deleting) return;
    const done = await supprimer.run(deleting.id);
    if (done !== null) {
      setDeleting(null);
      refetch();
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tests de validation"
        subtitle={`Un test par filière — réussite à partir de ${QUIZ_PASS_SCORE}%.`}
        actions={
          <ButtonLink href="/admin/quiz/nouvelle" variant="secondary">
            <Icon name="add" className="text-[18px]" /> Nouveau test
          </ButtonLink>
        }
      />

      {(supprimer.error ?? modifier.error) && (
        <ErrorBanner error={supprimer.error ?? modifier.error!} />
      )}

      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <div ref={listRef} className="space-y-4">
          <Table>
            <THead>
              <TR>
                <TH>Test</TH>
                <TH>Filière</TH>
                <TH>Questions</TH>
                <TH>État</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>

            {loading ? (
              <TableSkeleton columns={COLUMNS} />
            ) : tests.length === 0 ? (
              <TableEmpty
                columns={COLUMNS}
                icon="quiz"
                message="Aucun test de validation"
                hint="Sans test, aucun compte jeune ne peut être validé : créez-en un pour ouvrir le parcours."
              />
            ) : (
              <TBody>
                {tests.map((test) => {
                  const nombre = test._count?.questions ?? 0;
                  return (
                    <TR key={test.id}>
                      <TD>
                        <Link
                          href={`/admin/quiz/${test.id}`}
                          className="font-semibold text-primary hover:underline"
                        >
                          {test.titre}
                        </Link>
                        {test.description && (
                          <p className="line-clamp-1 text-xs text-on-surface-variant">
                            {test.description}
                          </p>
                        )}
                      </TD>
                      <TD>
                        {test.filiere ? (
                          <Badge tone="info" icon="school">
                            {test.filiere.nom}
                          </Badge>
                        ) : (
                          <Badge tone="neutral" icon="public">
                            Commun
                          </Badge>
                        )}
                      </TD>
                      <TD>
                        {/* Un test sous le minimum ne note plus rien : il faut
                            que ça se voie dès la liste. */}
                        {nombre < QUIZ_MIN_QUESTIONS ? (
                          <Badge tone="warning" icon="warning">
                            {nombre} — incomplet
                          </Badge>
                        ) : (
                          <span className="text-on-surface-variant">{nombre}</span>
                        )}
                      </TD>
                      <TD>
                        {test.active ? (
                          <Badge tone="success" icon="check_circle">
                            Actif
                          </Badge>
                        ) : (
                          <Badge tone="neutral">Désactivé</Badge>
                        )}
                      </TD>
                      <TD>
                        <div className="flex justify-end gap-1">
                          <Link
                            href={`/admin/quiz/${test.id}`}
                            aria-label="Ouvrir le test"
                            title="Ouvrir"
                            className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container"
                          >
                            <Icon name="chevron_right" className="text-[18px]" />
                          </Link>
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => void basculerActive(test)}
                            aria-label={test.active ? "Désactiver" : "Réactiver"}
                            title={test.active ? "Désactiver" : "Réactiver"}
                            className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container disabled:opacity-40"
                          >
                            <Icon
                              name={test.active ? "visibility_off" : "visibility"}
                              className="text-[18px]"
                            />
                          </button>
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => {
                              supprimer.reset();
                              setDeleting(test);
                            }}
                            aria-label="Supprimer le test"
                            title="Supprimer"
                            className="rounded-full p-2 text-error hover:bg-error-container disabled:opacity-40"
                          >
                            <Icon name="delete" className="text-[18px]" />
                          </button>
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
              unit="test"
            />
          )}
        </div>
      )}

      <Card className="border-dashed">
        <CardBody className="flex items-start gap-3 text-sm text-on-surface-variant">
          <Icon name="info" className="mt-0.5 shrink-0 text-secondary" />
          <div className="space-y-1">
            <p>
              Un candidat passe <strong className="text-on-surface">le test de sa filière</strong>,
              ou le <strong className="text-on-surface">test commun</strong> si sa filière n&apos;en
              a pas. Une filière ne peut avoir qu&apos;un seul test.
            </p>
            <p>
              <strong className="text-on-surface">Désactiver</strong> retire le test des passages à
              venir sans toucher aux tentatives déjà enregistrées.
            </p>
          </div>
        </CardBody>
      </Card>

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Supprimer ce test ?"
        description={deleting?.titre}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              Annuler
            </Button>
            <Button variant="danger" disabled={pending} onClick={() => void confirmerSuppression()}>
              Supprimer
            </Button>
          </>
        }
      >
        <p className="text-sm text-on-surface-variant">
          Ses {deleting?._count?.questions ?? 0} question(s) seront supprimées et les candidats de
          cette filière basculeront sur le test commun. Pour le retirer sans rien perdre, préférez
          le désactiver.
        </p>
      </Modal>
    </div>
  );
}
