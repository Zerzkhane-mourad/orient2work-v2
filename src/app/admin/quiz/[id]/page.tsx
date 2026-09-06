"use client";

/**
 * Fiche d'un test de validation : ses métadonnées, puis ses questions.
 *
 * Le corrigé est visible ici — l'API ne le sert qu'à un administrateur, et
 * jamais au candidat avant sa soumission.
 */
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  CardBody,
  ErrorBanner,
  ErrorState,
  Icon,
  LoadingState,
  Modal,
  RetourLien,
} from "@/components/ui";
import { TestQuestionsEditor } from "@/features/admin/test-questions-editor";
import { api } from "@/lib/api";
import { useApi, useMutation } from "@/lib/api/use-api";
import { formatDate } from "@/lib/utils";

export default function AdminTestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const { data: test, loading, error, refetch, setData } = useApi(() => api.admin.test(id), [id]);

  const modifier = useMutation(api.admin.updateTest);
  const supprimer = useMutation(api.admin.deleteTest);
  const pending = modifier.pending || supprimer.pending;

  const basculerActive = async () => {
    if (!test) return;
    const maj = await modifier.run(test.id, { active: !test.active });
    // La réponse porte le test à jour : inutile de recharger la fiche.
    if (maj) setData(maj);
  };

  const confirmerSuppression = async () => {
    const done = await supprimer.run(id);
    if (done !== null) router.push("/admin/quiz");
  };

  if (loading) return <LoadingState label="Chargement du test…" />;

  if (error || !test) {
    return (
      <div className="mx-auto max-w-2xl py-10">
        <ErrorState error={error} onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <RetourLien href="/admin/quiz">Retour aux tests</RetourLien>

      {(modifier.error ?? supprimer.error) && (
        <ErrorBanner error={modifier.error ?? supprimer.error!} />
      )}

      <Card>
        <CardBody className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="flex-1 space-y-3">
            <h1 className="font-headline text-2xl font-bold text-primary">{test.titre}</h1>

            <div className="flex flex-wrap items-center gap-2">
              {test.filiere ? (
                <Badge tone="info" icon="school">
                  {test.filiere.nom}
                </Badge>
              ) : (
                <Badge tone="neutral" icon="public">
                  Commun à toutes les filières
                </Badge>
              )}
              {test.active ? (
                <Badge tone="success" icon="check_circle">
                  Actif
                </Badge>
              ) : (
                <Badge tone="neutral">Désactivé</Badge>
              )}
            </div>

            {test.description && (
              <p className="text-sm text-on-surface-variant">{test.description}</p>
            )}

            <p className="text-sm text-on-surface-variant">
              Créé le {formatDate(test.createdAt)} · modifié le {formatDate(test.updatedAt)}
            </p>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:w-52">
            <ButtonLink href={`/admin/quiz/${test.id}/modifier`} variant="secondary">
              <Icon name="edit" className="text-[18px]" /> Modifier
            </ButtonLink>
            <Button variant="outline" disabled={pending} onClick={() => void basculerActive()}>
              <Icon name={test.active ? "visibility_off" : "visibility"} className="text-[18px]" />
              {test.active ? "Désactiver" : "Réactiver"}
            </Button>
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() => {
                supprimer.reset();
                setDeleting(true);
              }}
            >
              <Icon name="delete" className="text-[18px]" /> Supprimer
            </Button>
          </div>
        </CardBody>
      </Card>

      <TestQuestionsEditor test={test} onChange={setData} />

      <Card className="border-dashed">
        <CardBody className="flex items-start gap-3 text-sm text-on-surface-variant">
          <Icon name="info" className="mt-0.5 shrink-0 text-secondary" />
          <div className="space-y-1">
            <p>
              Ce test ne renvoie au candidat que son score, jamais la correction : la lui montrer
              suffirait à réussir la tentative suivante.
            </p>
            <p>
              <strong className="text-on-surface">Désactiver</strong> une question la retire des
              passages à venir sans toucher aux tentatives déjà enregistrées.
            </p>
          </div>
        </CardBody>
      </Card>

      <Modal
        open={deleting}
        onClose={() => setDeleting(false)}
        title="Supprimer ce test ?"
        description={test.titre}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(false)}>
              Annuler
            </Button>
            <Button variant="danger" disabled={pending} onClick={() => void confirmerSuppression()}>
              Supprimer
            </Button>
          </>
        }
      >
        <p className="text-sm text-on-surface-variant">
          Ses {test.questions?.length ?? 0} question(s) seront supprimées et les candidats de cette
          filière basculeront sur le test commun. Pour le retirer sans rien perdre, préférez le
          désactiver.
        </p>
      </Modal>
    </div>
  );
}
