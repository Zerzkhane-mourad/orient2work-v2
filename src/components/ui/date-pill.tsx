import { cn } from "@/lib/utils";

/**
 * Pastille de date : le jour en gros, le mois en petit.
 *
 * ── Pourquoi pas `formatDate` ───────────────────────────────────────────────
 *
 * Dans une LISTE de rendez-vous, « 12 septembre 2026 » se relit en entier à
 * chaque ligne, et l'année y est constante — donc muette. Cadré en pastille, le
 * jour se compare d'un coup d'œil d'une ligne à l'autre, et la date cesse
 * d'être du texte pour devenir un repère.
 *
 * Trois écrans dessinaient chacun le leur, à trois tailles et deux couleurs
 * différentes (tableau de bord admin, entreprise, jeune). C'est le même objet.
 */
export function DatePill({
  date,
  ton = "or",
  className,
}: {
  /** `YYYY-MM-DD`. */
  date: string;
  /** `or` sur fond clair, `clair` sur un panneau navy. */
  ton?: "or" | "clair";
  className?: string;
}) {
  // Midi local, jamais minuit : un `YYYY-MM-DD` nu est interprété en UTC par
  // certains moteurs, et la veille s'afficherait à l'ouest de Greenwich.
  const valeur = new Date(`${date}T12:00:00`);
  const jour = new Intl.DateTimeFormat("fr-FR", { day: "2-digit" }).format(valeur);
  const mois = new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(valeur).replace(".", "");

  return (
    <span
      className={cn(
        "flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg",
        ton === "or"
          ? "bg-secondary-container text-on-secondary-container"
          : "bg-white text-primary",
        className,
      )}
    >
      <span className="font-headline text-base font-bold leading-none tabular-nums">{jour}</span>
      <span className="text-[10px] font-semibold uppercase leading-tight">{mois}</span>
    </span>
  );
}
