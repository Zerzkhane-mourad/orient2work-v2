"use client";

/**
 * Barres horizontales, sur Recharts.
 *
 * ── Pourquoi horizontales ───────────────────────────────────────────────────
 *
 * Les catégories tracées ici portent des libellés longs — « Entretiens
 * demandés », le titre d'une formation, « En attente de validation ». En
 * colonnes, ces libellés se couchent à 45° ou se tronquent ; en barres, ils
 * s'écrivent horizontalement, à leur taille normale, et la liste se lit comme
 * du texte.
 *
 * Aucun camembert, aucun anneau à parts : comparer deux secteurs d'angles
 * voisins est un exercice que l'œil rate, là où deux longueurs alignées sur la
 * même base se comparent sans effort.
 *
 * ── Deux échelles de couleur, pour deux métiers différents ──────────────────
 *
 *  • `ordinale` — les catégories sont ORDONNÉES (les étapes d'un parcours).
 *    L'ordre porte du sens, donc la couleur le porte aussi : une seule teinte,
 *    qui s'éclaircit d'étape en étape.
 *  • `uniforme` — les catégories n'ont pas d'ordre naturel (des formations,
 *    des statuts). Toutes les barres prennent alors la MÊME couleur.
 *
 * Ce second point est le piège classique, et c'est le réglage par défaut de la
 * plupart des exemples de graphiques : teinter chaque barre selon sa valeur
 * paraît soigné et ne fait que redire en couleur ce que la longueur dit déjà —
 * en dépensant le seul canal disponible pour distinguer des séries.
 *
 * ── Rien n'est caché derrière le survol ─────────────────────────────────────
 *
 * `LabelList` écrit la valeur au bout de chaque barre. L'infobulle n'ajoute que
 * ce qui n'y tient pas : le libellé complet quand l'axe l'a tronqué, et la
 * part dans le total. Un graphique dont les valeurs ne s'obtiennent qu'à la
 * souris est illisible au clavier, sur écran tactile, et une fois imprimé.
 */
import {
  Bar,
  BarChart as RechartsBarChart,
  LabelList,
  Rectangle,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type BarShapeProps,
} from "recharts";
import { useReducedMotion } from "framer-motion";

/** Cinq pas de la rampe ordinale, du plus foncé au plus clair (`globals.css`). */
const RAMPE_ORDINALE = [
  "var(--chart-etape-1)",
  "var(--chart-etape-2)",
  "var(--chart-etape-3)",
  "var(--chart-etape-4)",
  "var(--chart-etape-5)",
];

export interface BarDatum {
  /** Libellé complet, affiché dans l'infobulle et — tronqué — sur l'axe. */
  label: string;
  value: number;
  /** Identifiant stable quand deux libellés peuvent coïncider. */
  key?: string;
  /** Complément affiché dans l'infobulle (une note, un détail). */
  detail?: string;
}

/**
 * Largeur de la colonne des libellés, et longueur maximale qui y tient.
 *
 * Recharts ne mesure pas le texte : il écrit le libellé tel quel, et un libellé
 * trop long déborde sur la zone de tracé au lieu d'être coupé. Les deux valeurs
 * vont donc ENSEMBLE — à 13px, une capitale de cette famille fait environ 7px,
 * soit ~140px pour 20 caractères, et il reste 18px de dégagement avant les
 * barres. Changer l'une sans l'autre casse l'alignement.
 *
 * La troncature ne perd rien : l'infobulle porte le libellé entier.
 */
const LARGEUR_AXE = 158;
const MAX_CARACTERES = 20;

const tronquer = (texte: string) =>
  texte.length > MAX_CARACTERES ? `${texte.slice(0, MAX_CARACTERES - 1)}…` : texte;

const formatFr = (valeur: number) => valeur.toLocaleString("fr-FR");

/**
 * Couleur d'une barre selon l'échelle et son rang.
 *
 * Au-delà de cinq étapes, la rampe ordinale s'arrêterait à des pas trop clairs
 * pour rester visibles sur la carte : la dernière couleur est conservée plutôt
 * que d'en inventer une sixième, qui ne tiendrait plus le plancher de contraste.
 */
function couleurBarre(echelle: "ordinale" | "uniforme", index: number): string {
  if (echelle === "uniforme") return "var(--chart-barre)";
  return RAMPE_ORDINALE[Math.min(index, RAMPE_ORDINALE.length - 1)]!;
}

/**
 * Dénominateur de la part affichée dans l'infobulle.
 *
 * Le choix n'est pas cosmétique, il décide de ce qui est VRAI :
 *
 *  • `total` — les catégories partitionnent une population (les statuts de
 *    compte : chaque jeune en occupe un et un seul). « 12 % du total » a un
 *    sens.
 *  • `max` — les catégories sont les étapes d'un parcours. Leur somme ne veut
 *    rien dire, mais leur rapport à l'étape la plus large en a un.
 *  • `aucune` — ni l'un ni l'autre. Cinq formations tirées d'un catalogue de
 *    cent ne partitionnent rien : « 22 % du total » inviterait à lire une part
 *    de marché là où il n'y a qu'un extrait de classement.
 */
type Part = "total" | "max" | "aucune";

interface InfobulleProps {
  active?: boolean;
  payload?: { payload: BarDatum & { part: number | null } }[];
  part?: Part;
}

/**
 * Infobulle.
 *
 * La VALEUR passe en premier et en gras, le libellé en second : le lecteur qui
 * survole une barre a déjà identifié la catégorie — c'est le nombre qu'il vient
 * chercher. C'est la hiérarchie de la légende, inversée.
 */
function Infobulle({ active, payload, part = "aucune" }: InfobulleProps) {
  const datum = payload?.[0]?.payload;
  if (!active || !datum) return null;

  return (
    <div className="max-w-64 rounded-md bg-inverse-surface px-3 py-2 shadow-level-2">
      <p className="font-headline text-base font-bold leading-tight text-white">
        {formatFr(datum.value)}
        {datum.part !== null && (
          <span className="ml-1.5 text-xs font-medium text-white/70">
            {Math.round(datum.part)} %{part === "max" ? " de l’étape la plus large" : " du total"}
          </span>
        )}
      </p>
      <p className="mt-0.5 text-xs leading-snug text-white/80">{datum.label}</p>
      {datum.detail && <p className="mt-1 text-xs text-white/60">{datum.detail}</p>}
    </div>
  );
}

interface BarChartProps {
  data: BarDatum[];
  /**
   * `ordinale` : catégories ordonnées, rampe navy dégressive (5 pas maximum).
   * `uniforme` : catégories sans ordre, une seule teinte.
   */
  echelle?: "ordinale" | "uniforme";
  /** Dénominateur de la part montrée au survol — voir le type `Part`. */
  part?: Part;
  /** Hauteur du cadre. À défaut, calculée pour laisser ~44px par barre. */
  hauteur?: number;
}

export function BarChart({
  data,
  echelle = "uniforme",
  part = "aucune",
  hauteur,
}: BarChartProps) {
  // Recharts anime sans se soucier du réglage système ; `framer-motion` lit la
  // préférence, et l'animation est simplement coupée plutôt que raccourcie —
  // une barre qui se déploie n'a pas d'état intermédiaire utile.
  const reduire = useReducedMotion();

  // La part est calculée ICI plutôt que dans l'infobulle : celle-ci ne reçoit
  // qu'UNE ligne, et n'a donc aucun moyen de connaître le reste de la série.
  const total = data.reduce((somme, d) => somme + d.value, 0);
  const maximum = Math.max(...data.map((d) => d.value), 0);
  const denominateur = part === "total" ? total : part === "max" ? maximum : 0;

  const donnees = data.map((d) => ({
    ...d,
    part: part === "aucune" || denominateur <= 0 ? null : (d.value / denominateur) * 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={hauteur ?? Math.max(160, data.length * 44 + 24)}>
      <RechartsBarChart
        data={donnees}
        layout="vertical"
        // Marge à droite : la valeur écrite au bout de la barre déborderait
        // sinon du cadre et serait rognée sur la barre la plus longue.
        margin={{ top: 0, right: 44, bottom: 0, left: 0 }}
        // Navigation au clavier + annonce des points par les lecteurs d'écran,
        // fournie par Recharts.
        accessibilityLayer
      >
        {/* L'axe des valeurs est MASQUÉ : chaque barre porte son nombre au bout,
            et une graduation qui redit ces mêmes nombres n'ajoute que du trait. */}
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          tickFormatter={tronquer}
          width={LARGEUR_AXE}
          tickLine={false}
          axisLine={false}
          tick={{ fill: "rgb(var(--color-on-surface-variant))", fontSize: 13 }}
        />
        <Tooltip
          content={<Infobulle part={part} />}
          // Le curseur est le repère de survol, pas une donnée : un pas
          // au-dessus de la surface, sans contour.
          cursor={{ fill: "var(--chart-grille)" }}
        />
        <Bar
          dataKey="value"
          // Épaisseur plafonnée : une barre qui remplit toute sa bande donne un
          // bloc compact, sans l'air qui rend une série lisible.
          barSize={16}
          isAnimationActive={!reduire}
          animationDuration={700}
          animationEasing="ease-out"
          /*
           * `shape` et non `<Cell>` : Recharts 3 déprécie `Cell`, qui
           * disparaîtra en 4.0. La fonction reçoit l'index de la barre, ce qui
           * est exactement ce dont la rampe ordinale a besoin.
           *
           * Les propriétés géométriques sont recopiées UNE À UNE plutôt que
           * diffusées : `props` porte aussi l'état d'animation et la donnée de
           * la ligne, que `Rectangle` passerait au DOM comme attributs inconnus.
           * `width` reste piloté par Recharts, donc l'animation d'entrée joue.
           */
          shape={(props: BarShapeProps) => (
            <Rectangle
              x={props.x}
              y={props.y}
              width={props.width}
              height={props.height}
              // Extrémité arrondie côté valeur, CARRÉE côté axe : le bord gauche
              // est la ligne de base commune à toutes les barres, et un coin
              // arrondi l'y ferait flotter au-dessus de son axe.
              radius={[0, 4, 4, 0]}
              fill={couleurBarre(echelle, props.index)}
            />
          )}
        >
          {/*
            La valeur au bout de la barre — c'est elle qui dispense d'un axe
            gradué. `formatter` prend son paramètre tel que Recharts le typa
            (`undefined` possible, pour une ligne sans valeur) et le normalise
            ici : l'annoter `number` ne ferait que déplacer le cas nul du
            compilateur vers l'exécution.
          */}
          <LabelList
            dataKey="value"
            position="right"
            formatter={(valeur) => formatFr(Number(valeur ?? 0))}
            fill="rgb(var(--color-primary))"
            fontSize={13}
            fontWeight={600}
          />
        </Bar>
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
