"use client";

import { useMemo, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  EmptyState,
  ErrorBanner,
  ErrorState,
  Icon,
  Modal,
  SkeletonText,
  StarRatingInput,
  Textarea,
} from "@/components/ui";
import { useProfileOptional } from "@/features/jeune/profil/profile-store";
import { api } from "@/lib/api";
import { toAvis } from "@/lib/api/adapters";
import type { ApiAvisList } from "@/lib/api/types";
import { useApi, useMutation } from "@/lib/api/use-api";
import { RatingSummary } from "./rating-summary";
import { AvisCard } from "./avis-card";

const PAGE_SIZE = 4;
const MAX_COMMENT = 1000;

interface AvisSectionProps {
  formationId: string;
  /** Le dépôt d'avis exige d'avoir terminé la lecture du cours. */
  canReview: boolean;
}

/**
 * Bloc d'avis : synthèse des notes, liste filtrable, vote « utile » et
 * rédaction de son propre avis.
 *
 * Tout est côté serveur : un seul avis par jeune et par formation (upsert), un
 * seul vote « utile » par avis et par jeune. Les auteurs ne sont identifiés que
 * par leur prénom et l'initiale de leur nom — l'API ne renvoie rien de plus.
 */
export function AvisSection({ formationId, canReview }: AvisSectionProps) {
  const profile = useProfileOptional();
  const [filter, setFilter] = useState<number | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(0);
  const [commentaire, setCommentaire] = useState("");

  const { data, loading, error, refetch, setData } = useApi(
    () => api.formations.listAvis(formationId, 1, 50),
    [formationId],
  );

  const save = useMutation(api.formations.saveAvis);
  const remove = useMutation(api.formations.removeAvis);
  const vote = useMutation(api.formations.toggleAvisUtile);

  const all = useMemo(() => (data?.items ?? []).map(toAvis), [data]);
  const mesVotes = data?.mesVotes ?? [];

  // L'API n'indique pas quel avis est le mien ; on le retrouve par l'auteur,
  // que le serveur construit toujours de la même façon (« Prénom N. »).
  const monAuteur = profile ? `${profile.jeune.prenom} ${profile.jeune.nom.charAt(0)}.` : null;
  const mine = monAuteur ? (all.find((a) => a.auteurNom === monAuteur) ?? null) : null;

  const filtered = useMemo(
    () => (filter ? all.filter((a) => a.note === filter) : all),
    [all, filter],
  );

  const openModal = () => {
    setNote(mine?.note ?? 0);
    setCommentaire(mine?.commentaire ?? "");
    setOpen(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!note) return;
    const saved = await save.run(formationId, note, commentaire.trim());
    if (saved) {
      setOpen(false);
      refetch();
    }
  };

  const removeMine = async () => {
    if (!mine) return;
    const done = await remove.run(formationId, mine.id);
    setOpen(false);
    if (done !== null) refetch();
  };

  /**
   * Vote « utile » — mis à jour SUR PLACE, sans rechargement.
   *
   * Un `refetch()` remettait `loading` à vrai : le composant repassait par sa
   * branche « squelette », et tout le bloc d'avis — synthèse, filtres, liste —
   * disparaissait puis se reconstruisait à chaque clic sur un pouce. Il
   * rapatriait au passage les cinquante avis pour n'en changer qu'un.
   *
   * L'affichage est donc modifié tout de suite, puis réconcilié avec la réponse
   * du serveur : elle seule connaît le compte exact, d'autres lecteurs ayant pu
   * voter entre-temps.
   */
  const toggleHelpful = async (avisId: string) => {
    const votePose = mesVotes.includes(avisId);

    setData((precedent) => (precedent ? appliquerVote(precedent, avisId, !votePose) : precedent));

    const aJour = await vote.run(formationId, avisId);

    setData((precedent) => {
      if (!precedent) return precedent;
      // Refus du serveur — voter pour son propre avis, session expirée : on
      // revient exactement à l'état d'avant le clic.
      if (!aJour) return appliquerVote(precedent, avisId, votePose);

      return {
        ...precedent,
        items: precedent.items.map((item) => (item.id === avisId ? aJour : item)),
      };
    });
  };

  if (loading) {
    return (
      <Card>
        <CardBody className="space-y-4">
          <h2 className="font-headline text-lg font-bold text-primary">Avis des étudiants</h2>
          <SkeletonText lines={6} />
        </CardBody>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardBody>
          <ErrorState error={error} onRetry={refetch} />
        </CardBody>
      </Card>
    );
  }

  const actionError = save.error ?? remove.error ?? vote.error;

  return (
    <Card>
      <CardBody className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-headline text-lg font-bold text-primary">Avis des étudiants</h2>
          {/* Le backend refuse un avis sur une formation non terminée : on
              désactive plutôt que de laisser tomber sur un 403. */}
          {profile && (
            <Button
              variant={mine ? "outline" : "secondary"}
              size="sm"
              onClick={openModal}
              disabled={!canReview && !mine}
              title={
                !canReview && !mine ? "Terminez la formation pour laisser un avis." : undefined
              }
            >
              <Icon name={mine ? "edit" : "star"} className="text-[16px]" />
              {mine ? "Modifier mon avis" : "Donner mon avis"}
            </Button>
          )}
        </div>

        {actionError && <ErrorBanner error={actionError} />}

        {all.length === 0 ? (
          <EmptyState
            icon="star"
            title="Aucun avis pour le moment"
            description={
              canReview
                ? "Soyez le premier à partager votre retour sur cette formation."
                : "Terminez la formation pour pouvoir laisser le premier avis."
            }
            action={
              canReview ? (
                <Button variant="secondary" onClick={openModal}>
                  Donner mon avis
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <RatingSummary
              avis={all}
              filter={filter}
              onFilter={(f) => {
                setFilter(f);
                setVisible(PAGE_SIZE);
              }}
            />

            <div className="border-t border-outline-variant">
              {filtered.length === 0 ? (
                <p className="py-8 text-center text-sm text-on-surface-variant">
                  Aucun avis avec cette note.
                </p>
              ) : (
                filtered
                  .slice(0, visible)
                  .map((a) => (
                    <AvisCard
                      key={a.id}
                      avis={a}
                      isMine={a.id === mine?.id}
                      helpful={mesVotes.includes(a.id)}
                      onToggleHelpful={() => void toggleHelpful(a.id)}
                    />
                  ))
              )}
            </div>

            {visible < filtered.length && (
              <Button variant="outline" fullWidth onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                Voir plus d&apos;avis ({filtered.length - visible})
              </Button>
            )}
          </>
        )}
      </CardBody>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={mine ? "Modifier mon avis" : "Donner mon avis"}
        description="Votre retour aide les autres jeunes talents à choisir leurs formations."
        footer={
          <>
            {mine && (
              <Button
                variant="ghost"
                onClick={() => void removeMine()}
                disabled={remove.pending}
                className="mr-auto text-error"
              >
                Supprimer
              </Button>
            )}
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="secondary"
              form="avis-form"
              type="submit"
              disabled={!note || save.pending}
            >
              {save.pending ? "Publication…" : "Publier"}
            </Button>
          </>
        }
      >
        <form id="avis-form" onSubmit={submit} className="space-y-6">
          <div className="rounded-lg bg-surface-container-low py-5">
            <p className="mb-3 text-center text-sm font-semibold text-on-surface">
              Comment évalueriez-vous cette formation ?
            </p>
            <StarRatingInput value={note} onChange={setNote} />
          </div>

          <Textarea
            label="Votre commentaire"
            rows={6}
            maxLength={MAX_COMMENT}
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            placeholder="Qu'avez-vous appris ? Qu'est-ce qui vous a été le plus utile ?"
            hint={`${commentaire.length}/${MAX_COMMENT} caractères`}
          />
        </form>
      </Modal>
    </Card>
  );
}

/**
 * Applique une bascule de vote à la page d'avis en mémoire.
 *
 * Pure et exhaustive : le compteur ET la liste des votes du lecteur changent
 * ENSEMBLE. Les traiter séparément laisserait un bouton allumé au-dessus d'un
 * compteur inchangé — l'incohérence qu'on cherche précisément à éviter.
 */
function appliquerVote(page: ApiAvisList, avisId: string, vote: boolean): ApiAvisList {
  return {
    ...page,
    items: page.items.map((item) =>
      item.id === avisId
        ? // `Math.max` : un compteur ne descend pas sous zéro, même si l'état
          // local avait dérivé de celui du serveur.
          { ...item, utile: Math.max(0, item.utile + (vote ? 1 : -1)) }
        : item,
    ),
    mesVotes: vote
      ? [...page.mesVotes, avisId]
      : page.mesVotes.filter((id) => id !== avisId),
  };
}
