import { cn } from "@/lib/utils";

interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** "Hot skill" styling — gold background. */
  hot?: boolean;
}

/** Skill/tag chip: pill-shaped, light navy tint (or gold for hot skills). */
export function Chip({ hot, className, ...props }: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-sm font-medium",
        hot ? "bg-secondary-container text-on-secondary-container" : "bg-primary/10 text-primary",
        className,
      )}
      {...props}
    />
  );
}
