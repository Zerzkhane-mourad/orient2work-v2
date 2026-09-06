"use client";

/**
 * Courbe d'aire — l'activité d'une semaine, jour par jour.
 *
 * ── Ce que cette forme dit, et que les autres ne disent pas ─────────────────
 *
 * Les barres et les jauges de ce dossier comparent des CATÉGORIES. Ici l'axe
 * horizontal est le TEMPS : la ligne relie les jours, et c'est cette continuité
 * qui rend un creux du mercredi ou une pointe du vendredi lisibles d'un coup
 * d'œil. Relier deux catégories serait une faute ; relier deux jours, non.
 *
 * ── Pourquoi une aire et pas seulement une ligne ────────────────────────────
 *
 * L'aire teintée sous la courbe donne son poids à la série et pose la ligne sur
 * un sol — le zéro. Le dégradé s'éteint vers le bas au lieu d'un aplat : un
 * aplat aurait la même valeur visuelle que les cartes voisines et se lirait
 * comme un bloc, pas comme une mesure.
 *
 * ── Courbe adoucie, mais pas n'importe comment ──────────────────────────────
 *
 * `monotone` et non `natural` : l'interpolation monotone ne dépasse JAMAIS les
 * valeurs mesurées. Une spline naturelle, elle, produit des bosses entre deux
 * points — une courbe qui monterait à 14 entre deux jours à 12 affirmerait un
 * chiffre qui n'existe pas.
 *
 * ── Lisible sans souris ─────────────────────────────────────────────────────
 *
 * Une courbe ne porte aucun nombre écrit : au clavier, à la lecture d'écran ou
 * à l'impression, elle ne dit rien. La liste `sr-only` sous le graphique donne
 * la série entière en toutes lettres, et `accessibilityLayer` permet de la
 * parcourir au clavier.
 */
import { useId } from "react";
import {
  Area,
  AreaChart as RechartsAreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useReducedMotion } from "framer-motion";

export interface AreaDatum {
  /** Libellé d'axe, court — « lun. », « 12/09 ». */
  label: string;
  value: number;
  /** Date complète, écrite dans l'infobulle sous la valeur. */
  detail?: string;
  /** Nombre porté par la pastille de l'infobulle — le quantième du mois. */
  badge?: string;
}

/**
 * Graduations compactes : « 12k » plutôt que « 12 000 ».
 *
 * L'axe des ordonnées n'est pas un tableau de chiffres, c'est une échelle :
 * quatre caractères y suffisent, et la place gagnée revient à la courbe.
 */
function formatTick(valeur: number): string {
  if (Math.abs(valeur) >= 1000) {
    const milliers = valeur / 1000;
    return `${Number.isInteger(milliers) ? milliers : milliers.toFixed(1)}k`;
  }
  return String(valeur);
}

interface InfobulleProps {
  active?: boolean;
  payload?: { payload: AreaDatum }[];
  unite: string;
}

/**
 * Infobulle en pastille.
 *
 * La VALEUR domine, la date la suit en petit : celui qui survole un point a
 * déjà repéré le jour sur l'axe — c'est le nombre qu'il vient chercher. Le
 * quantième est repris dans le disque à gauche, qui sert d'ancre visuelle entre
 * la pastille et le point survolé.
 */
function Infobulle({ active, payload, unite }: InfobulleProps) {
  const datum = payload?.[0]?.payload;
  if (!active || !datum) return null;

  return (
    <div className="flex items-center gap-2.5 rounded-full bg-inverse-surface py-1.5 pl-1.5 pr-4 shadow-level-2">
      {datum.badge && (
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary-container font-headline text-sm font-bold text-on-secondary-container">
          {datum.badge}
        </span>
      )}
      <span className="leading-tight">
        <span className="block font-headline text-base font-bold text-white">
          {datum.value.toLocaleString("fr-FR")}{" "}
          <span className="text-xs font-medium text-white/70">{unite}</span>
        </span>
        {datum.detail && <span className="block text-[11px] text-white/70">{datum.detail}</span>}
      </span>
    </div>
  );
}

interface AreaChartProps {
  data: AreaDatum[];
  /** Nom de ce qui est compté, au pluriel — « entretiens », « candidatures ». */
  unite: string;
  hauteur?: number;
}

export function AreaChart({ data, unite, hauteur = 260 }: AreaChartProps) {
  // Un identifiant par instance : deux graphiques sur la même page
  // partageraient sinon le même `<linearGradient>`, et le second effacerait le
  // premier.
  const gradientId = useId().replace(/:/g, "");

  // Recharts anime sans se soucier du réglage système ; l'animation est coupée
  // plutôt que raccourcie — une courbe qui se dessine n'a pas d'état
  // intermédiaire utile.
  const reduire = useReducedMotion();

  return (
    <div>
      <ResponsiveContainer width="100%" height={hauteur}>
        <RechartsAreaChart
          data={data}
          // Marge haute : l'infobulle en pastille se pose AU-DESSUS du point le
          // plus haut, et serait rognée par le cadre sans ce dégagement.
          margin={{ top: 24, right: 8, bottom: 0, left: 0 }}
          accessibilityLayer
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              {/*
                0,32 en haut : mesuré à l'écran, pas choisi au jugé — à 0,28 le
                remplissage se confondait avec la carte dès que la courbe
                descendait, et l'aire cessait de porter la série. Il s'éteint
                complètement en bas pour que le sol reste la ligne du zéro.
              */}
              <stop offset="0%" stopColor="var(--chart-barre)" stopOpacity={0.32} />
              <stop offset="100%" stopColor="var(--chart-barre)" stopOpacity={0} />
            </linearGradient>
          </defs>

          {/* Grille HORIZONTALE seulement, et en pointillé : elle sert à
              reporter une hauteur sur l'échelle, pas à quadriller. Des
              verticales redoubleraient les libellés de jours. */}
          <CartesianGrid
            vertical={false}
            strokeDasharray="6 6"
            stroke="var(--chart-grille)"
          />

          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={12}
            tick={{ fill: "rgb(var(--color-on-surface-variant))", fontSize: 12 }}
          />
          <YAxis
            width={44}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatTick}
            // `allowDecimals: false` : on compte des entretiens et des
            // candidatures — une graduation à « 2,5 » n'existe pas.
            allowDecimals={false}
            tick={{ fill: "rgb(var(--color-on-surface-variant))", fontSize: 12 }}
          />

          <Tooltip
            content={<Infobulle unite={unite} />}
            // Le trait de survol reprend la teinte de la courbe : c'est le même
            // objet qu'on désigne, pas un repère indépendant.
            cursor={{ stroke: "var(--chart-etape-4)", strokeWidth: 1, strokeDasharray: "4 4" }}
          />

          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--chart-barre)"
            strokeWidth={2.5}
            fill={`url(#${gradientId})`}
            // Pas de point à chaque jour : sept pastilles alignées attirent
            // l'œil autant que la courbe. Seul le point survolé apparaît.
            dot={false}
            activeDot={{
              r: 5,
              fill: "var(--chart-barre)",
              stroke: "rgb(var(--color-surface-container-lowest))",
              strokeWidth: 3,
            }}
            isAnimationActive={!reduire}
            animationDuration={700}
            animationEasing="ease-out"
          />
        </RechartsAreaChart>
      </ResponsiveContainer>

      {/* La série en toutes lettres : c'est elle que lit un lecteur d'écran. */}
      <ul className="sr-only">
        {data.map((d) => (
          <li key={d.label}>
            {d.detail ?? d.label} : {d.value} {unite}
          </li>
        ))}
      </ul>
    </div>
  );
}
