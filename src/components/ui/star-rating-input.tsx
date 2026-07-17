"use client";

import { useState } from "react";
import { MdStar, MdStarOutline } from "react-icons/md";
import { cn } from "@/lib/utils";

const LABELS: Record<number, string> = {
  1: "Décevant",
  2: "Moyen",
  3: "Correct",
  4: "Très bien",
  5: "Excellent",
};

interface StarRatingInputProps {
  value: number;
  onChange: (value: number) => void;
  /** Star size in px. */
  size?: number;
}

/** Interactive 1–5 star picker with hover preview (Udemy-style). */
export function StarRatingInput({ value, onChange, size = 36 }: StarRatingInputProps) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex" onMouseLeave={() => setHover(0)} role="radiogroup" aria-label="Note">
        {[1, 2, 3, 4, 5].map((star) => {
          const Star = star <= shown ? MdStar : MdStarOutline;
          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={value === star}
              aria-label={`${star} étoile${star > 1 ? "s" : ""} — ${LABELS[star]}`}
              onMouseEnter={() => setHover(star)}
              onFocus={() => setHover(star)}
              onBlur={() => setHover(0)}
              onClick={() => onChange(star)}
              className="p-0.5 text-secondary-fixed-dim transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary rounded"
            >
              <Star style={{ width: size, height: size }} />
            </button>
          );
        })}
      </div>
      <p
        className={cn(
          "text-sm font-semibold transition-colors",
          shown ? "text-primary" : "text-on-surface-variant",
        )}
      >
        {shown ? LABELS[shown] : "Sélectionnez une note"}
      </p>
    </div>
  );
}
