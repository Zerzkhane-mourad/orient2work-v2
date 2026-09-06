import { Icon, type IconName } from "./icon";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: IconName;
  title: string;
  description?: string;
  action?: React.ReactNode;
  /**
   * Sans cadre ni respiration haute — pour un bloc DÉJÀ encadré : l'intérieur
   * d'un tableau, d'une carte. Un liseré pointillé posé à 1px du bord d'un
   * cadre existant se lit comme un défaut d'alignement.
   */
  plain?: boolean;
}

/** Placeholder shown when a list has no items. */
export function EmptyState({ icon = "inbox", title, description, action, plain }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center text-center",
        plain ? "py-6" : "rounded-xl border border-dashed border-outline-variant py-16",
      )}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">
        <Icon name={icon} className="text-2xl" />
      </span>
      <h3 className="mt-4 font-bold text-primary">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-on-surface-variant">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
