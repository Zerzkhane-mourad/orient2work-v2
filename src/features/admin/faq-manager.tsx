"use client";

/**
 * Gestion des questions fréquentes.
 *
 * ── Pourquoi une liste et non un tableau ────────────────────────────────────
 *
 * Les autres écrans d'administration listent des enregistrements que l'on
 * filtre et compare : un tableau y a du sens. Ici l'objet administré est du
 * TEXTE destiné à être lu, et une réponse de deux cents caractères ne rentre
 * pas dans une cellule sans être tronquée — or c'est justement sa longueur et
 * son ton qu'il faut juger avant de publier.
 *
 * L'écran reprend donc la forme de la page publique : question en gras, réponse
 * dessous, dans l'ordre exact où le visiteur les verra. On relit ce qu'on
 * publie, pas un extrait.
 *
 * ── Pas de pagination ───────────────────────────────────────────────────────
 *
 * Une FAQ se tient à la main et se compte en dizaines. La pagination
 * n'apporterait rien et casserait le classement : « monter » sur la première
 * ligne d'une page devrait faire changer de page.
 */
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
  Input,
  Modal,
  PageHeader,
  SkeletonList,
  Textarea,
} from "@/components/ui";
import { useApi, useMutation } from "@/lib/api/use-api";
import { api, type ApiError } from "@/lib/api";
import type { ApiFaqAdmin } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/** Bornes reprises du validateur serveur, pour refuser avant l'aller-retour. */
const MAX_QUESTION = 200;
const MAX_REPONSE = 2000;

interface Brouillon {
  question: string;
  reponse: string;
  publiee: boolean;
}

const BROUILLON_VIDE: Brouillon = { question: "", reponse: "", publiee: true };

function brouillonValide(brouillon: Brouillon): boolean {
  return (
    brouillon.question.trim().length >= 2 &&
    brouillon.question.trim().length <= MAX_QUESTION &&
    brouillon.reponse.trim().length >= 2 &&
    brouillon.reponse.trim().length <= MAX_REPONSE
  );
}

export function FaqManager() {
  const { data, loading, error, refetch, setData } = useApi(() => api.faq.liste(), []);
  const questions: ApiFaqAdmin[] = data ?? [];

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ApiFaqAdmin | null>(null);
  const [deleting, setDeleting] = useState<ApiFaqAdmin | null>(null);
  const [brouillon, setBrouillon] = useState<Brouillon>(BROUILLON_VIDE);

  const create = useMutation(api.faq.creer);
  const update = useMutation(api.faq.modifier);
  const remove = useMutation(api.faq.supprimer);
  const deplacer = useMutation(api.faq.deplacer);

  const pending = create.pending || update.pending || remove.pending || deplacer.pending;
  const actionError = create.error ?? update.error ?? remove.error ?? deplacer.error;

  const publiees = questions.filter((q) => q.publiee).length;

  const closeAll = () => {
    setCreating(false);
    setEditing(null);
    setDeleting(null);
    create.reset();
    update.reset();
    remove.reset();
  };

  const openCreate = () => {
    setBrouillon(BROUILLON_VIDE);
    create.reset();
    setCreating(true);
  };

  const openEdit = (faq: ApiFaqAdmin) => {
    setBrouillon({ question: faq.question, reponse: faq.reponse, publiee: faq.publiee });
    update.reset();
    setEditing(faq);
  };

  const submitCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    const creee = await create.run({
      question: brouillon.question.trim(),
      reponse: brouillon.reponse.trim(),
      publiee: brouillon.publiee,
    });
    if (creee) {
      closeAll();
      refetch();
    }
  };

  const submitEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    const modifiee = await update.run(editing.id, {
      question: brouillon.question.trim(),
      reponse: brouillon.reponse.trim(),
      publiee: brouillon.publiee,
    });
    if (modifiee) {
      closeAll();
      refetch();
    }
  };

  /**
   * Bascule publiée / masquée sans quitter la liste.
   *
   * Mise à jour EN PLACE plutôt que `refetch()` : c'est l'action la plus
   * fréquente de l'écran, et repasser par l'état de chargement ferait
   * disparaître la liste entière — donc perdre la position de lecture — pour un
   * changement d'un seul badge.
   */
  const basculerPublication = async (faq: ApiFaqAdmin) => {
    const modifiee = await update.run(faq.id, { publiee: !faq.publiee });
    if (modifiee) {
      setData((precedent) =>
        (precedent ?? []).map((q) => (q.id === faq.id ? { ...q, publiee: modifiee.publiee } : q)),
      );
    }
  };

  /**
   * Déplace la question d'un cran.
   *
   * Le serveur renvoie la liste complète réordonnée : on l'installe telle
   * quelle. Recalculer l'ordre côté client donnerait un affichage qui diverge
   * silencieusement de la base au premier cas limite.
   */
  const deplacerQuestion = async (id: string, direction: "haut" | "bas") => {
    const liste = await deplacer.run(id, direction);
    if (liste) setData(liste);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Questions fréquentes"
        subtitle="Ce que voient les visiteurs sur la page d'accueil, dans cet ordre."
        actions={
          <Button variant="secondary" onClick={openCreate}>
            <Icon name="add" className="text-[18px]" /> Nouvelle question
          </Button>
        }
      />

      {actionError && !creating && !editing && !deleting && <ErrorBanner error={actionError} />}

      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : loading ? (
        <SkeletonList count={4} />
      ) : questions.length === 0 ? (
        /* `EmptyState` plutôt qu'un bloc vide réécrit ici : même icône, même
           titre, même appel à l'action, mais la mise en forme des états vides
           tient désormais en un seul endroit pour toute l'application. */
        <EmptyState
          icon="help"
          title="Aucune question pour le moment"
          description="Tant que cette liste est vide, la rubrique n'apparaît pas sur la page d'accueil."
          action={
            <Button variant="secondary" onClick={openCreate}>
              <Icon name="add" className="text-[18px]" /> Ajouter la première question
            </Button>
          }
        />
      ) : (
        <>
          <p className="text-sm text-on-surface-variant">
            {questions.length} question(s), dont <strong>{publiees}</strong> visible(s) par les
            visiteurs.
          </p>

          <ul className="space-y-3">
            {questions.map((faq, index) => (
              <li key={faq.id}>
                <Card
                  className={cn(
                    // Une question masquée doit se repérer d'un coup d'œil dans
                    // la liste, sans lire le badge : le fond suffit.
                    !faq.publiee && "border-dashed bg-surface-container-low",
                  )}
                >
                  <CardBody className="flex gap-4">
                    {/* Colonne d'ordre : les flèches restent à gauche, alignées
                        d'une carte à l'autre, pour pouvoir cliquer en série. */}
                    <div className="flex shrink-0 flex-col items-center gap-1 pt-0.5">
                      <button
                        type="button"
                        disabled={pending || index === 0}
                        onClick={() => void deplacerQuestion(faq.id, "haut")}
                        className="rounded p-1 text-on-surface-variant hover:bg-surface-container disabled:opacity-30"
                        aria-label={`Monter « ${faq.question} »`}
                        title="Monter"
                      >
                        <Icon name="chevron_right" className="-rotate-90 text-[18px]" />
                      </button>
                      <span className="font-headline text-sm font-bold text-on-surface-variant">
                        {index + 1}
                      </span>
                      <button
                        type="button"
                        disabled={pending || index === questions.length - 1}
                        onClick={() => void deplacerQuestion(faq.id, "bas")}
                        className="rounded p-1 text-on-surface-variant hover:bg-surface-container disabled:opacity-30"
                        aria-label={`Descendre « ${faq.question} »`}
                        title="Descendre"
                      >
                        <Icon name="chevron_right" className="rotate-90 text-[18px]" />
                      </button>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <p className="font-headline text-lg font-semibold text-primary">
                          {faq.question}
                        </p>
                        {faq.publiee ? (
                          <Badge tone="success" icon="check_circle">
                            En ligne
                          </Badge>
                        ) : (
                          <Badge tone="neutral">Masquée</Badge>
                        )}
                      </div>

                      {/* Réponse en entier, jamais tronquée : c'est ce texte-là
                          que l'on valide avant de le publier. */}
                      <p className="mt-2 whitespace-pre-line text-sm text-on-surface-variant">
                        {faq.reponse}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-1">
                        <Button variant="ghost" size="sm" disabled={pending} onClick={() => openEdit(faq)}>
                          <Icon name="edit" className="text-[18px]" /> Modifier
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={pending}
                          onClick={() => void basculerPublication(faq)}
                        >
                          <Icon
                            name={faq.publiee ? "visibility_off" : "visibility"}
                            className="text-[18px]"
                          />
                          {faq.publiee ? "Masquer" : "Publier"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={pending}
                          className="text-error hover:bg-error-container"
                          onClick={() => {
                            remove.reset();
                            setDeleting(faq);
                          }}
                        >
                          <Icon name="delete" className="text-[18px]" /> Supprimer
                        </Button>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}

      <Card className="border-dashed">
        <CardBody className="flex items-start gap-3 text-sm text-on-surface-variant">
          <Icon name="info" className="mt-0.5 shrink-0 text-secondary" />
          <div className="space-y-1">
            <p>
              <strong className="text-on-surface">Masquer</strong> retire la question de la page
              d&apos;accueil sans la perdre : à préférer à la suppression quand une réponse doit
              être revue.
            </p>
            <p>
              <strong className="text-on-surface">L&apos;ordre</strong> de cette liste est celui du
              site. Placez en tête ce qui bloque le plus souvent une inscription.
            </p>
            <p>
              La réponse est du texte simple : la mise en forme riche n&apos;est pas reprise, seuls
              les retours à la ligne le sont.
            </p>
          </div>
        </CardBody>
      </Card>

      {/* Création */}
      <FormulaireModal
        open={creating}
        titre="Nouvelle question"
        description="Elle sera ajoutée en fin de liste ; vous pourrez la remonter ensuite."
        formId="faq-create"
        brouillon={brouillon}
        onChange={setBrouillon}
        onSubmit={submitCreate}
        onClose={closeAll}
        error={create.error}
        pending={pending}
        libelleAction={create.pending ? "Création…" : "Créer"}
      />

      {/* Modification */}
      <FormulaireModal
        open={editing !== null}
        titre="Modifier la question"
        description="Les changements sont visibles immédiatement sur la page d'accueil."
        formId="faq-edit"
        brouillon={brouillon}
        onChange={setBrouillon}
        onSubmit={submitEdit}
        onClose={closeAll}
        error={update.error}
        pending={pending}
        libelleAction={update.pending ? "Enregistrement…" : "Enregistrer"}
      />

      {/* Suppression */}
      <Modal
        open={deleting !== null}
        onClose={closeAll}
        title="Supprimer cette question ?"
        description={deleting?.question ?? ""}
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
                void remove.run(deleting.id).then((done) => {
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
            La question et sa réponse seront perdues. Pour la retirer temporairement du site,
            utilisez plutôt <strong className="text-on-surface">Masquer</strong>.
          </p>
        )}
      </Modal>
    </div>
  );
}

/**
 * Le formulaire est le MÊME à la création et à la modification.
 *
 * Deux modales quasi identiques finiraient par diverger : un champ ajouté d'un
 * côté et pas de l'autre, une borne corrigée une seule fois. Seuls les libellés
 * et le gestionnaire de soumission changent, ils sont donc paramétrés.
 */
function FormulaireModal({
  open,
  titre,
  description,
  formId,
  brouillon,
  onChange,
  onSubmit,
  onClose,
  error,
  pending,
  libelleAction,
}: {
  open: boolean;
  titre: string;
  description: string;
  formId: string;
  brouillon: Brouillon;
  onChange: (brouillon: Brouillon) => void;
  onSubmit: (event: React.FormEvent) => void;
  onClose: () => void;
  error: ApiError | null;
  pending: boolean;
  libelleAction: string;
}) {
  const restantQuestion = MAX_QUESTION - brouillon.question.length;
  const restantReponse = MAX_REPONSE - brouillon.reponse.length;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={titre}
      description={description}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button
            variant="secondary"
            form={formId}
            type="submit"
            disabled={pending || !brouillonValide(brouillon)}
          >
            {libelleAction}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && <ErrorBanner error={error} />}

        <Input
          label="Question"
          placeholder="Le test de validation est-il obligatoire ?"
          value={brouillon.question}
          maxLength={MAX_QUESTION}
          onChange={(e) => onChange({ ...brouillon, question: e.target.value })}
          error={error?.issueFor("question")}
          hint={`Formulez-la comme un visiteur la poserait. ${restantQuestion} caractères restants.`}
          required
        />

        <Textarea
          label="Réponse"
          rows={6}
          placeholder="Répondez d'abord, expliquez ensuite."
          value={brouillon.reponse}
          maxLength={MAX_REPONSE}
          onChange={(e) => onChange({ ...brouillon, reponse: e.target.value })}
          error={error?.issueFor("reponse")}
          hint={`Texte simple ; les retours à la ligne sont conservés. ${restantReponse} caractères restants.`}
          required
        />

        {/* Case à cocher plutôt qu'un interrupteur : l'état par défaut est
            « publiée », et la décrocher est une action rare et explicite. */}
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-outline-variant p-3">
          <input
            type="checkbox"
            checked={brouillon.publiee}
            onChange={(e) => onChange({ ...brouillon, publiee: e.target.checked })}
            className="mt-0.5 h-4 w-4 rounded border-outline text-primary focus:ring-primary"
          />
          <span className="text-sm">
            <span className="font-semibold text-on-surface">Visible sur la page d&apos;accueil</span>
            <span className="block text-on-surface-variant">
              Décochez pour préparer une réponse sans la publier tout de suite.
            </span>
          </span>
        </label>
      </form>
    </Modal>
  );
}
