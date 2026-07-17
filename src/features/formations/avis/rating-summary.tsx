"use client";

import { StarRating } from "@/components/ui";
import type { Avis } from "@/lib/types";
import { cn } from "@/lib/utils";

interface RatingSummaryProps {
  avis: Avis[];
  /** Currently selected star filter, or null for "all". */
  filter: number | null;
  onFilter: (star: number | null) => void;
}

/** Average score + clickable distribution histogram (Udemy-style). */
export function RatingSummary({ avis, filter, onFilter }: RatingSummaryProps) {
  const total = avis.length;
  const average = total ? avis.reduce((sum, a) => sum + a.note, 0) / total : 0;

  const distribution = [5, 4, 3, 2, 1].map((star) => {
    const count = avis.filter((a) => a.note === star).length;
    return { star, count, percent: total ? (count / total) * 100 : 0 };
  });

  return (
    <div className="grid gap-8 sm:grid-cols-[auto_1fr] sm:items-center">
      {/* Average */}
      <div className="text-center">
        <p className="font-headline text-5xl font-bold text-[#8a6d0b]">{average.toFixed(1)}</p>
        <StarRating value={average} showValue={false} className="mt-1 justify-center" />
        <p className="mt-1 text-sm text-on-surface-variant">
          {total} avis
        </p>
      </div>

      {/* Distribution */}
      <div className="space-y-1.5">
        {distribution.map(({ star, count, percent }) => {
          const active = filter === star;
          return (
            <button
              key={star}
              type="button"
              disabled={count === 0}
              onClick={() => onFilter(active ? null : star)}
              aria-pressed={active}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-2 py-1 transition-colors disabled:cursor-default disabled:opacity-50",
                count > 0 && "hover:bg-surface-container-low",
                active && "bg-surface-container",
              )}
            >
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-variant">
                <span
                  className="block h-full rounded-full bg-secondary-fixed-dim transition-all"
                  style={{ width: `${percent}%` }}
                />
              </span>
              <span className="flex w-20 shrink-0 items-center gap-1">
                <StarRating value={star} showValue={false} className="scale-75 origin-left" />
              </span>
              <span
                className={cn(
                  "w-10 shrink-0 text-right text-xs",
                  active ? "font-bold text-primary" : "text-on-surface-variant",
                )}
              >
                {Math.round(percent)}%
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
