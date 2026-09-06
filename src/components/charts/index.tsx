"use client";

/**
 * Point d'entrée des graphiques — et frontière de chargement.
 *
 * ── Pourquoi Recharts n'est pas importé directement ─────────────────────────
 *
 * Recharts pèse plusieurs centaines de kilo-octets et ne peut RIEN tracer
 * avant d'avoir mesuré son conteneur dans le DOM. Rendu côté serveur, il
 * produit donc un cadre vide : tout le coût, aucun bénéfice.
 *
 * Pire, ce coût était bien réel — chargée dans le rendu statique, la
 * bibliothèque faisait sortir le processus de construction de Next par manque
 * de mémoire sous Windows (`0xC0000142`), alors que ce même rendu ne pouvait
 * produire que des cadres vides.
 *
 * `ssr: false` retire donc Recharts du rendu serveur ET du paquet serveur : la
 * page arrive complète — ses titres, ses chiffres, ses jauges linéaires — et
 * les deux graphiques se peignent dès que le navigateur a la main.
 *
 * `LinearMeters` est exporté DIRECTEMENT, sans passer par `dynamic` : il
 * n'importe rien de Recharts et se rend très bien côté serveur. Le retarder ne
 * ferait que faire clignoter trois barres de progression.
 */
import dynamic from "next/dynamic";

export { LinearMeters, type MeterDatum } from "./linear-meters";
export type { BarDatum } from "./bar-chart";
export type { AreaDatum } from "./area-chart";

/**
 * Réservation de place pendant le chargement du module.
 *
 * Sans hauteur, la carte se replierait puis se rouvrirait quand le graphique
 * arrive — un sursaut de mise en page à chaque affichage. Le fond reprend la
 * piste des graphiques : la zone se lit comme un graphique en attente, pas
 * comme une erreur.
 */
function CadreEnAttente({ hauteur }: { hauteur: number }) {
  return (
    <div
      className="w-full animate-pulse rounded-md bg-[var(--chart-piste)]"
      style={{ height: hauteur }}
      aria-hidden
    />
  );
}

export const BarChart = dynamic(() => import("./bar-chart").then((m) => m.BarChart), {
  ssr: false,
  loading: () => <CadreEnAttente hauteur={220} />,
});

export const AreaChart = dynamic(() => import("./area-chart").then((m) => m.AreaChart), {
  ssr: false,
  loading: () => <CadreEnAttente hauteur={260} />,
});

export const GaugeRadial = dynamic(() => import("./gauge").then((m) => m.GaugeRadial), {
  ssr: false,
  // La jauge est ronde et de taille fixe : le substitut l'est aussi, sinon la
  // carte change de hauteur au moment où l'anneau apparaît.
  loading: () => (
    <div className="h-[180px] w-[180px] animate-pulse rounded-full bg-[var(--chart-piste)]" />
  ),
});
