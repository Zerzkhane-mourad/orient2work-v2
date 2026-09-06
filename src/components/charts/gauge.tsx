"use client";

/**
 * Jauges — la forme juste pour UN rapport, pas pour une série.
 *
 * ── Pourquoi ce n'est pas un camembert ──────────────────────────────────────
 *
 * « 72 % des tentatives valident le test » est un rapport unique. Le tracer en
 * camembert à deux parts met de la chromatique autour d'un nombre qui se
 * suffit, et demande au lecteur de comparer deux secteurs pour retrouver une
 * valeur déjà écrite au centre.
 *
 * Une JAUGE est la forme correcte : une valeur, sa piste, et le reste à
 * parcourir. La piste n'est pas grise mais un pas CLAIR DE LA MÊME RAMPE que
 * le remplissage — c'est ce qui fait lire les deux ensemble comme une seule
 * mesure, au lieu de deux objets superposés.
 *
 * ── Le nombre reste le sujet ────────────────────────────────────────────────
 *
 * L'anneau situe le chiffre d'un coup d'œil ; c'est le chiffre qu'on lit. D'où
 * un anneau fin plutôt qu'un « donut » épais, et un nombre au corps
 * d'affichage posé au centre.
 */
import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from "recharts";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GaugeRadialProps {
  /** 0–100. */
  value: number;
  /** Phrase sous le chiffre — ce que le pourcentage mesure réellement. */
  legende: string;
  taille?: number;
  className?: string;
}

export function GaugeRadial({ value, legende, taille = 180, className }: GaugeRadialProps) {
  const reduire = useReducedMotion();
  const borne = Math.min(100, Math.max(0, value));

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <div className="relative" style={{ width: taille, height: taille }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            data={[{ name: "taux", value: borne }]}
            innerRadius="76%"
            outerRadius="100%"
            // Départ à midi, sens horaire : un arc qui commence à trois heures
            // se lit comme un défaut de rendu, pas comme une convention.
            startAngle={90}
            endAngle={-270}
          >
            {/*
              C'est `PolarAngleAxis` qui donne son ÉCHELLE à la jauge. Sans lui,
              Recharts étalonne l'arc sur la plus grande valeur du jeu de
              données — avec une seule valeur, l'anneau serait donc toujours
              plein, quel que soit le pourcentage.
            */}
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar
              dataKey="value"
              background={{ fill: "var(--chart-piste)" }}
              fill="var(--chart-barre)"
              cornerRadius={999}
              isAnimationActive={!reduire}
              animationDuration={900}
              animationEasing="ease-out"
            />
          </RadialBarChart>
        </ResponsiveContainer>

        {/*
          Le nombre est posé PAR-DESSUS le graphique, pas dedans : un `<text>`
          SVG n'hériterait pas des polices de l'application et ne se
          redimensionnerait pas avec le reste de l'interface.

          Chiffres PROPORTIONNELS, pas `tabular-nums` : à ce corps, des chiffres
          de largeur égale font paraître « 72 » anormalement espacé. La chasse
          fixe ne sert qu'à aligner des colonnes de nombres.
        */}
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          aria-hidden
        >
          <span className="font-headline text-[2.75rem] font-bold leading-none text-primary">
            {Math.round(borne)}
            <span className="align-super text-[0.5em] font-semibold">%</span>
          </span>
        </div>
      </div>

      {/* La légende porte l'annonce accessible : le SVG est décoratif, le sens
          est dans ce texte, qui dit à la fois la valeur et ce qu'elle mesure. */}
      <p className="max-w-[24ch] text-center text-sm text-on-surface-variant">
        <span className="sr-only">{Math.round(borne)} % </span>
        {legende}
      </p>
    </div>
  );
}

