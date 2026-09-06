import { cn } from "@/lib/utils";

interface ScoreGaugeProps {
  /** Score obtenu, 0–100. */
  score: number;
  /** Seuil de réussite, matérialisé sur la jauge. */
  seuil: number;
  /** `lg` pour l'écran de résultat, `sm` en récapitulatif. */
  size?: "sm" | "lg";
  /** Légende sous la jauge ; à défaut, le seuil est rappelé. */
  caption?: string;
}

/**
 * Score situé PAR RAPPORT AU SEUIL, et non seul.
 *
 * « 72 % » ne dit rien tant qu'on ignore ce qu'il fallait atteindre : le repère
 * posé sur la barre transforme un chiffre en verdict lisible d'un coup d'œil.
 * Partagé par l'écran de résultat et la page de préparation, pour que le même
 * score s'y présente exactement de la même façon.
 */
export function ScoreGauge({ score, seuil, size = "lg", caption }: ScoreGaugeProps) {
  const valeur = Math.max(0, Math.min(100, score));
  const atteint = valeur >= seuil;

  return (
    <div className={cn("w-full space-y-2", size === "lg" ? "max-w-xs" : "max-w-none")}>
      <p
        className={cn(
          "font-headline font-bold text-primary",
          size === "lg" ? "text-5xl" : "text-2xl",
        )}
      >
        {valeur}%
      </p>

      <div
        className={cn(
          "relative w-full overflow-hidden rounded-full bg-surface-variant",
          size === "lg" ? "h-2" : "h-1.5",
        )}
        role="progressbar"
        aria-valuenow={valeur}
        aria-valuemin={0}
        aria-valuemax={100}
        // Le seuil fait partie de l'information : sans lui, la valeur annoncée
        // à la synthèse vocale n'est qu'un nombre hors contexte.
        aria-label={`Score ${valeur}% sur un seuil de réussite de ${seuil}%`}
      >
        <div
          className={cn("h-full rounded-full transition-all", atteint ? "bg-success" : "bg-error")}
          style={{ width: `${valeur}%` }}
        />
        <span
          aria-hidden
          className="absolute top-0 h-full w-0.5 bg-on-surface-variant"
          style={{ left: `${Math.min(100, Math.max(0, seuil))}%` }}
        />
      </div>

      <p className="text-xs text-on-surface-variant">
        {caption ?? `Seuil de réussite : ${seuil}%`}
      </p>
    </div>
  );
}
