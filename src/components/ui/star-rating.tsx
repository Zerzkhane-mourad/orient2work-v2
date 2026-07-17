import { MdStar, MdStarHalf, MdStarOutline } from "react-icons/md";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  /** 0–5. */
  value: number;
  count?: number;
  /** Show the numeric score before the stars (Udemy style). */
  showValue?: boolean;
  className?: string;
}

/** Udemy-style rating: bold score + 5 gold stars + review count. */
export function StarRating({ value, count, showValue = true, className }: StarRatingProps) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-sm", className)}>
      {showValue && <span className="font-bold text-[#8a6d0b]">{value.toFixed(1)}</span>}
      <span className="flex text-secondary-fixed-dim" aria-hidden>
        {Array.from({ length: 5 }).map((_, i) => {
          const filled = i + 1 <= Math.floor(value);
          const half = !filled && i < value;
          const Star = filled ? MdStar : half ? MdStarHalf : MdStarOutline;
          return <Star key={i} className="text-[15px]" />;
        })}
      </span>
      {typeof count === "number" && (
        <span className="text-on-surface-variant">({count.toLocaleString("fr-FR")})</span>
      )}
    </span>
  );
}
