"use client";

import { Avatar, Badge, Icon, StarRating } from "@/components/ui";
import type { Avis } from "@/lib/types";
import { cn } from "@/lib/utils";

interface AvisCardProps {
  avis: Avis;
  /** Marks the review written by the current user. */
  isMine?: boolean;
  helpful: boolean;
  onToggleHelpful: () => void;
}

/** A single learner review. */
export function AvisCard({ avis, isMine, helpful, onToggleHelpful }: AvisCardProps) {
  return (
    <article className="flex gap-4 border-b border-outline-variant py-5 last:border-0">
      <Avatar src={avis.auteurPhoto} alt={avis.auteurNom} size={44} />

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="font-bold text-primary">{avis.auteurNom}</h4>
          {isMine && <Badge tone="gold">Votre avis</Badge>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StarRating value={avis.note} showValue={false} />
          <span className="text-xs text-on-surface-variant">{avis.dateLabel}</span>
        </div>

        <p className="whitespace-pre-line text-on-surface">{avis.commentaire}</p>

        <div className="flex items-center gap-3 pt-1">
          <span className="text-xs text-on-surface-variant">Cet avis vous a-t-il été utile ?</span>
          <button
            type="button"
            onClick={onToggleHelpful}
            aria-pressed={helpful}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors",
              helpful
                ? "border-secondary bg-secondary-container text-on-secondary-container"
                : "border-outline-variant text-on-surface-variant hover:border-secondary hover:text-primary",
            )}
          >
            <Icon name="thumb_up" filled={helpful} className="text-[14px]" />
            {avis.utile + (helpful ? 1 : 0)}
          </button>
        </div>
      </div>
    </article>
  );
}
