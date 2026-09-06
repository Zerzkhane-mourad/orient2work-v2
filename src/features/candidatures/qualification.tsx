/**
 * Signaux de qualification d'un candidat, côté recruteur.
 *
 * Ce que regarde un recruteur en premier sur une liste : « ce profil vaut-il
 * que je l'ouvre ». Deux chiffres y répondent, et ils étaient jusqu'ici soit
 * absents, soit noyés — le score apparaissait comme une pastille grise au
 * milieu des badges de statut, et les formations n'apparaissaient nulle part.
 *
 * ── Pourquoi DEUX chiffres et pas un seul ───────────────────────────────────
 *
 * Les fusionner en un « score global » serait plus compact et moins honnête :
 * le test mesure un niveau à un instant donné, les formations mesurent un
 * effort dans la durée. Un recruteur cherchant un profil opérationnel tout de
 * suite et un autre cherchant quelqu'un qui progresse ne lisent pas le même
 * chiffre. On montre les deux, il arbitre.
 *
 * Et « validées sur suivies » plutôt que « validées » seul : 2 sur 9 et 2 sur 2
 * ne disent pas la même chose de la persévérance.
 */
import { Icon } from "@/components/ui";
import { QUIZ_PASS_SCORE } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface Props {
  scoreQuiz?: number;
  formationsValidees: number;
  formationsSuivies: number;
}

/**
 * Teinte du score selon la marge au-dessus du seuil exigé.
 *
 * Le seuil n'est pas décoratif : sous lui, le profil n'est pas validé et ne
 * devrait pas pouvoir candidater. La nuance distingue donc « juste au-dessus »
 * de « largement au-dessus », ce qu'un chiffre nu ne fait pas d'un coup d'œil.
 */
function tonScore(score: number): string {
  // `on-success-container` et non `success` : ce dernier ne donnait que 4,11:1
  // sur son fond, sous le minimum AA de 4,5:1 pour ce corps de texte.
  if (score >= 90) return "bg-success-container text-on-success-container";
  if (score >= QUIZ_PASS_SCORE) return "bg-secondary-container text-on-secondary-container";
  return "bg-surface-container text-on-surface-variant";
}

export function Qualification({ scoreQuiz, formationsValidees, formationsSuivies }: Props) {
  return (
    <dl className="flex flex-wrap items-stretch gap-2">
      <div
        className={cn(
          "flex min-w-24 flex-col justify-center rounded-lg px-3 py-2",
          typeof scoreQuiz === "number"
            ? tonScore(scoreQuiz)
            : "bg-surface-container text-on-surface-variant",
        )}
      >
        <dt className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide opacity-80">
          <Icon name="fact_check" className="text-[13px]" /> Test
        </dt>
        <dd className="font-headline text-lg font-bold leading-tight">
          {/* Un tiret n'explique rien ; « Non passé » dit pourquoi la case
              est vide. */}
          {typeof scoreQuiz === "number" ? (
            `${scoreQuiz} %`
          ) : (
            <span className="text-sm font-semibold">Non passé</span>
          )}
        </dd>
      </div>

      <div className="flex min-w-24 flex-col justify-center rounded-lg bg-surface-container px-3 py-2 text-on-surface-variant">
        <dt className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide opacity-80">
          <Icon name="school" className="text-[13px]" /> Formations
        </dt>
        <dd className="font-headline text-lg font-bold leading-tight text-primary">
          {formationsValidees}
          {/* Le total en petit : il donne la mesure sans voler la vedette au
              nombre qui compte, celui des certificats obtenus. */}
          <span className="text-sm font-semibold text-on-surface-variant">
            {" "}
            / {formationsSuivies}
          </span>
        </dd>
      </div>
    </dl>
  );
}
