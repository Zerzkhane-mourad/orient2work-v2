import { Icon } from "@/components/ui";
import { cn } from "@/lib/utils";

export type ParcoursStep = { label: string; done: boolean; current?: boolean };

/** Horizontal "Oriented → Hired" journey tracker (specialty component from DESIGN.md). */
export function ParcoursTracker({ steps }: { steps: ParcoursStep[] }) {
  const doneCount = steps.filter((s) => s.done).length;
  const progress = steps.length > 1 ? (doneCount / (steps.length - 1)) * 100 : 0;

  return (
    <div className="relative flex items-center justify-between px-2">
      <div className="absolute left-4 right-4 top-5 h-1 -translate-y-1/2 rounded-full bg-surface-variant" />
      <div
        className="absolute left-4 top-5 h-1 -translate-y-1/2 rounded-full bg-secondary-container transition-all"
        style={{ width: `calc((100% - 2rem) * ${progress / 100})` }}
      />
      {steps.map((step) => (
        <div key={step.label} className="relative z-10 flex flex-col items-center gap-2">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full shadow-sm",
              step.done
                ? "bg-secondary-container text-on-secondary-container"
                : step.current
                  ? "animate-pulse border-2 border-secondary bg-surface-container-highest"
                  : "bg-surface-variant text-on-surface-variant",
            )}
          >
            {step.done ? (
              <Icon name="check" className="text-lg" />
            ) : step.current ? (
              <span className="h-3 w-3 rounded-full bg-secondary" />
            ) : (
              <span className="h-2.5 w-2.5 rounded-full bg-on-surface-variant/40" />
            )}
          </div>
          <span
            className={cn(
              "text-xs font-semibold",
              step.done || step.current ? "text-primary" : "text-on-surface-variant",
            )}
          >
            {step.label}
          </span>
        </div>
      ))}
    </div>
  );
}
