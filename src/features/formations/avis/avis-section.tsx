"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  EmptyState,
  Icon,
  Modal,
  StarRatingInput,
  Textarea,
} from "@/components/ui";
import type { Avis } from "@/lib/types";
import { RatingSummary } from "./rating-summary";
import { AvisCard } from "./avis-card";

const PAGE_SIZE = 4;
const MAX_COMMENT = 1000;

const storageKey = (formationId: string) => `o2w:formation:${formationId}:avis`;
const helpfulKey = (formationId: string) => `o2w:formation:${formationId}:avis-utiles`;

interface AvisSectionProps {
  formationId: string;
  /** Reviews from the server/seed data. */
  initial: Avis[];
  /** Display name used when the current user posts a review. */
  auteurNom: string;
  auteurPhoto?: string;
}

/**
 * Reviews block: rating summary + distribution filter, paginated list,
 * "helpful" voting, and a modal to leave or edit your own review.
 *
 * The user's review and helpful votes persist in localStorage (no backend in v1).
 */
export function AvisSection({ formationId, initial, auteurNom, auteurPhoto }: AvisSectionProps) {
  const [mine, setMine] = useState<Avis | null>(null);
  const [helpfulIds, setHelpfulIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<number | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(0);
  const [commentaire, setCommentaire] = useState("");

  // Restore the user's own review + helpful votes after mount.
  useEffect(() => {
    try {
      const savedAvis = window.localStorage.getItem(storageKey(formationId));
      if (savedAvis) setMine(JSON.parse(savedAvis) as Avis);
      const savedHelpful = window.localStorage.getItem(helpfulKey(formationId));
      if (savedHelpful) setHelpfulIds(JSON.parse(savedHelpful) as string[]);
    } catch {
      // Ignore corrupted local data.
    }
  }, [formationId]);

  const all = useMemo(() => (mine ? [mine, ...initial] : initial), [mine, initial]);
  const filtered = useMemo(
    () => (filter ? all.filter((a) => a.note === filter) : all),
    [all, filter],
  );

  const openModal = () => {
    setNote(mine?.note ?? 0);
    setCommentaire(mine?.commentaire ?? "");
    setOpen(true);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!note) return;
    const review: Avis = {
      id: mine?.id ?? `mine-${formationId}`,
      formationId,
      auteurNom,
      auteurPhoto,
      note,
      commentaire: commentaire.trim(),
      dateLabel: "À l'instant",
      utile: mine?.utile ?? 0,
    };
    setMine(review);
    window.localStorage.setItem(storageKey(formationId), JSON.stringify(review));
    setOpen(false);
  };

  const removeMine = () => {
    setMine(null);
    window.localStorage.removeItem(storageKey(formationId));
    setOpen(false);
  };

  const toggleHelpful = (id: string) => {
    setHelpfulIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      window.localStorage.setItem(helpfulKey(formationId), JSON.stringify(next));
      return next;
    });
  };

  return (
    <Card>
      <CardBody className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-headline text-lg font-bold text-primary">Avis des étudiants</h2>
          <Button variant={mine ? "outline" : "secondary"} size="sm" onClick={openModal}>
            <Icon name={mine ? "edit" : "star"} className="text-[16px]" />
            {mine ? "Modifier mon avis" : "Donner mon avis"}
          </Button>
        </div>

        {all.length === 0 ? (
          <EmptyState
            icon="star"
            title="Aucun avis pour le moment"
            description="Soyez le premier à partager votre retour sur cette formation."
            action={
              <Button variant="secondary" onClick={openModal}>
                Donner mon avis
              </Button>
            }
          />
        ) : (
          <>
            <RatingSummary avis={all} filter={filter} onFilter={(f) => {
              setFilter(f);
              setVisible(PAGE_SIZE);
            }} />

            <div className="border-t border-outline-variant">
              {filtered.length === 0 ? (
                <p className="py-8 text-center text-sm text-on-surface-variant">
                  Aucun avis avec cette note.
                </p>
              ) : (
                filtered.slice(0, visible).map((a) => (
                  <AvisCard
                    key={a.id}
                    avis={a}
                    isMine={a.id === mine?.id}
                    helpful={helpfulIds.includes(a.id)}
                    onToggleHelpful={() => toggleHelpful(a.id)}
                  />
                ))
              )}
            </div>

            {visible < filtered.length && (
              <Button
                variant="outline"
                fullWidth
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
              >
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
              <Button variant="ghost" onClick={removeMine} className="mr-auto text-error">
                Supprimer
              </Button>
            )}
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button variant="secondary" form="avis-form" type="submit" disabled={!note}>
              Publier
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
