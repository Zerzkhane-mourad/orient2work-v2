import { ButtonLink, Icon } from "@/components/ui";
import { parcoursProgress, type ParcoursState, type ParcoursStep } from "./parcours";
import { cn } from "@/lib/utils";

/**
 * Parcours d'accompagnement, en frise verticale.
 *
 * Vertical et non horizontal : chaque étape porte désormais son avancement
 * chiffré et, pour celle en cours, un bouton. À l'horizontale, quatre colonnes
 * n'offraient la place que d'un mot, et la frise se réduisait à une décoration
 * répétant ce que la carte de score disait déjà.
 *
 * Purement présentationnel : l'état vient de `buildParcours`.
 */

/** Apparence de la pastille, par état. */
const BULLET: Record<ParcoursState, string> = {
  done: "border-success bg-success-container text-success",
  current: "border-secondary bg-secondary-container text-on-secondary-container",
  attention: "border-error bg-error-container text-error",
  // Ouverte mais pas prioritaire : contour franc, comme une étape disponible.
  todo: "border-outline-variant bg-surface-container-lowest text-on-surface-variant",
  // Fermée : aplat éteint, pour se distinguer de `todo` au premier coup d'œil.
  locked: "border-outline-variant bg-surface-container text-on-surface-variant/60",
};

/**
 * État dit en toutes lettres.
 *
 * La couleur et l'icône sont le seul indice visuel de l'état : hors écran, un
 * lecteur ne distinguait pas une étape franchie d'une étape verrouillée.
 */
const STATE_LABEL: Record<ParcoursState, string> = {
  done: "Étape terminée",
  current: "Étape en cours",
  attention: "Étape à reprendre",
  todo: "Étape à venir",
  locked: "Étape verrouillée",
};

/** `null` : la pastille garde l'icône propre à l'étape. */
const BULLET_ICON: Record<ParcoursState, "check" | "lock" | "priority_high" | null> = {
  done: "check",
  current: null,
  attention: "priority_high",
  todo: null,
  locked: "lock",
};

export function ParcoursTracker({ steps }: { steps: ParcoursStep[] }) {
  const progress = parcoursProgress(steps);
  const doneCount = steps.filter((step) => step.state === "done").length;

  return (
    <div className="space-y-4">
      {/* Avancement global */}
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-semibold text-on-surface">
            {doneCount}/{steps.length} étapes franchies
          </p>
          <p className="text-sm font-bold text-primary">{progress}%</p>
        </div>
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-surface-variant"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Avancement du parcours d'accompagnement"
        >
          <div
            className="h-full rounded-full bg-secondary-container transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* `<ol>` : le parcours est une séquence ordonnée, pas une liste de cartes. */}
      <ol className="relative space-y-1">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          const actionable = step.state === "current" || step.state === "attention";
          const bulletIcon = BULLET_ICON[step.state];

          return (
            <li
              key={step.key}
              aria-current={step.state === "current" ? "step" : undefined}
              className="relative flex gap-3 pb-1"
            >
              {/* Pastille + trait de liaison */}
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    BULLET[step.state],
                  )}
                >
                  {bulletIcon ? (
                    <Icon name={bulletIcon} filled={step.state === "done"} className="text-[18px]" />
                  ) : (
                    <Icon name={step.icon} className="text-[18px]" />
                  )}
                </span>
                {!isLast && (
                  <span
                    aria-hidden
                    className={cn(
                      "w-0.5 flex-1 rounded-full",
                      step.state === "done" ? "bg-success/40" : "bg-outline-variant",
                    )}
                  />
                )}
              </div>

              {/* Contenu */}
              <div className={cn("min-w-0 flex-1", isLast ? "pb-0" : "pb-5")}>
                <div className="flex flex-wrap items-center gap-x-2">
                  <p
                    className={cn(
                      "font-bold",
                      step.state === "locked" || step.state === "todo"
                        ? "text-on-surface-variant"
                        : "text-primary",
                    )}
                  >
                    {step.label}
                  </p>
                  <span className="sr-only">— {STATE_LABEL[step.state]}</span>
                  {step.state === "attention" && (
                    <span className="rounded-full bg-error-container px-2 py-0.5 text-[11px] font-bold text-error">
                      À reprendre
                    </span>
                  )}
                </div>

                <p className="mt-0.5 text-sm text-on-surface-variant">{step.detail}</p>

                {step.state === "locked" && step.lockedReason && (
                  <p className="mt-1 flex items-start gap-1.5 text-xs text-on-surface-variant">
                    <Icon name="lock" className="mt-px shrink-0 text-[14px]" />
                    {step.lockedReason}
                  </p>
                )}

                {/*
                  Bouton sur la SEULE étape actionnable : quatre boutons côte à
                  côte ne hiérarchisent rien, et le parcours doit répondre à une
                  question unique — « et maintenant ? ».
                */}
                {actionable && (
                  <ButtonLink
                    href={step.href}
                    variant="secondary"
                    size="sm"
                    className="mt-2.5"
                  >
                    {step.action}
                    <Icon name="arrow_forward" className="text-[16px]" />
                  </ButtonLink>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
