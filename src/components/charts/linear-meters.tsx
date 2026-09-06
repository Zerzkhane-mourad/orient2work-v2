/**
 * Jauges linéaires empilées.
 *
 * ── Pourquoi ce n'est pas un graphique ──────────────────────────────────────
 *
 * « 3 000 profils validés sur 5 000 » est un rapport unique. Le tracer en
 * camembert à deux parts met de la chromatique autour d'un nombre qui se
 * suffit, et demande au lecteur de comparer deux secteurs pour retrouver une
 * valeur déjà écrite à côté.
 *
 * Trois rapports se comparent aussi bien mieux ALIGNÉS SUR UNE BASE COMMUNE
 * qu'en trois anneaux séparés : la base commune rend l'écart lisible sans que
 * l'œil ait à mesurer des angles.
 *
 * ── Pourquoi pas Recharts ───────────────────────────────────────────────────
 *
 * Trois barres de progression n'ont ni axe, ni échelle, ni survol à gérer. Y
 * mettre un moteur de graphiques coûterait un conteneur mesuré par barre pour
 * dessiner deux rectangles — et priverait ce bloc du rendu serveur, puisque
 * Recharts ne peut rien tracer avant d'avoir mesuré le DOM.
 *
 * Ce fichier n'importe donc RIEN de Recharts, et c'est délibéré : il reste
 * rendu côté serveur pendant que les vrais graphiques se chargent.
 *
 * La piste n'est pas grise mais un pas CLAIR DE LA MÊME RAMPE que le
 * remplissage — c'est ce qui fait lire « traité » et « reste » comme une seule
 * mesure, au lieu de deux objets superposés.
 */
import { cn } from "@/lib/utils";

export interface MeterDatum {
  label: string;
  /** Numérateur — la part traitée. */
  value: number;
  /** Dénominateur — l'ensemble de référence. */
  total: number;
  /** Ce que compte le dénominateur, pour lever toute ambiguïté. */
  detail?: string;
}

export function LinearMeters({ data, className }: { data: MeterDatum[]; className?: string }) {
  return (
    <ul className={cn("space-y-5", className)}>
      {data.map((datum) => {
        // Un dénominateur nul n'est pas une erreur : c'est une plateforme vide
        // au premier jour. La jauge reste à zéro plutôt que d'afficher « NaN% ».
        const pourcentage = datum.total > 0 ? Math.round((datum.value / datum.total) * 100) : 0;

        return (
          <li key={datum.label}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-sm text-on-surface-variant">{datum.label}</span>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-primary">
                {pourcentage} %
              </span>
            </div>

            {/* Piste et barre CARRÉES à gauche : le bord gauche est la ligne de
                base, et un coin arrondi y ferait flotter la barre au-dessus. */}
            <div className="mt-1.5 h-2.5 w-full rounded-r-sm bg-[var(--chart-piste)]">
              <div
                className="h-full rounded-r-sm bg-[var(--chart-barre)] transition-[width] duration-700 ease-out"
                style={{ width: `${Math.min(100, pourcentage)}%` }}
              />
            </div>

            {/* Le rapport est écrit en clair : « 60 % » seul ne dit pas de quoi,
                et une jauge sans son dénominateur se surinterprète. */}
            <p className="mt-1.5 text-xs tabular-nums text-on-surface-variant">
              {datum.value.toLocaleString("fr-FR")} sur {datum.total.toLocaleString("fr-FR")}
              {datum.detail ? ` ${datum.detail}` : ""}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
