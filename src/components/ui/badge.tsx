import { Icon, type IconName } from "./icon";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "primary" | "gold" | "success" | "warning" | "error" | "info";

/*
 * Chaque ton écrit sur SON conteneur, jamais la couleur pleine sur le
 * conteneur clair.
 *
 * « succès » et « avertissement » faisaient exception, et c'étaient les deux
 * seuls tons sous le seuil : #2e7d55 sur #c8f2da tenait 4,11:1, #9a6a00 sur
 * #ffe9b3 3,96:1 — pour un libellé de 12px, qui exige 4,5:1. Leurs pendants
 * `on-*-container` donnent 7,6:1 et 8,3:1, sans changer la teinte du fond :
 * les pastilles gardent exactement la même couleur, leur texte est simplement
 * lisible.
 */
const tones: Record<Tone, string> = {
  neutral: "bg-surface-container text-on-surface-variant",
  primary: "bg-primary/10 text-primary",
  gold: "bg-secondary-container text-on-secondary-container",
  success: "bg-success-container text-on-success-container",
  warning: "bg-warning-container text-on-warning-container",
  error: "bg-error-container text-on-error-container",
  info: "bg-surface-container-highest text-primary",
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  /** Optional Material icon name rendered before the label. */
  icon?: IconName;
}

/** Small pill label for statuses and metadata tags. */
export function Badge({ tone = "neutral", icon, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        tones[tone],
        className,
      )}
      {...props}
    >
      {icon && <Icon name={icon} className="text-[14px]" />}
      {children}
    </span>
  );
}
