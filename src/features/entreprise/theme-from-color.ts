/**
 * Thème calculé à partir des couleurs du logo.
 *
 * ── La méthode est celle des six thèmes livrés en dur ────────────────────────
 *
 * `globals.css` documente comment « marine », « émeraude », « océan »… ont été
 * produits : chaque jeton de la palette marine est converti en OKLCH, GARDE SA
 * CLARTÉ ET SA CHROMA, et prend la teinte du thème (famille primaire + surfaces)
 * ou celle de son accent (famille secondaire), avec écrêtage au gamut sRGB.
 *
 * Ce module exécute cette même méthode à la volée, pour une teinte quelconque
 * extraite d'un logo. Conséquence directe, et c'est tout l'intérêt : les
 * rapports de contraste de la palette de base sont conservés — le contraste
 * dépend presque entièrement de L, et L n'est jamais touché. Un thème
 * automatique ne peut donc pas produire l'écran illisible qu'un « prends la
 * couleur du logo et mets-la en fond » fabrique une fois sur deux.
 *
 * Les valeurs ci-dessous sont la palette marine de `:root`, recopiée jeton pour
 * jeton. Marine reste donc le thème `auto` d'un logo bleu marine, au bruit
 * d'arrondi près.
 */
import { oklchToRgb, parseHex, rgbToOklch, toChannels, toHex, type Oklch } from "@/lib/color";

/** Jetons `--color-*` de la famille primaire et des surfaces (teinte principale). */
const BASE_PRIMAIRE: Record<string, string> = {
  background: "249 249 255",
  surface: "249 249 255",
  "surface-dim": "207 218 241",
  "surface-bright": "249 249 255",
  "surface-container-low": "240 243 255",
  "surface-container": "231 238 255",
  "surface-container-high": "222 232 255",
  "surface-container-highest": "216 227 250",
  "surface-variant": "216 227 250",
  "surface-tint": "77 95 125",
  "inverse-surface": "38 49 66",
  "inverse-on-surface": "235 241 255",
  "on-background": "17 28 44",
  "on-surface": "17 28 44",
  primary: "11 31 58",
  "primary-container": "11 31 58",
  "on-primary-container": "117 135 167",
  "inverse-primary": "181 199 234",
  "primary-fixed": "214 227 255",
  "primary-fixed-dim": "181 199 234",
  "on-primary-fixed": "7 28 54",
  "on-primary-fixed-variant": "54 71 100",
};

/** Jetons `--color-*` de la famille secondaire (teinte d'accent). */
const BASE_SECONDAIRE: Record<string, string> = {
  secondary: "115 92 0",
  "secondary-container": "254 214 91",
  "on-secondary-container": "116 92 0",
  "secondary-fixed": "255 224 136",
  "secondary-fixed-dim": "233 195 73",
  "on-secondary-fixed": "36 26 0",
  "on-secondary-fixed-variant": "87 69 0",
};

/**
 * Jetons `--chart-*` — couleurs COMPLÈTES et non canaux : Recharts les reçoit
 * telles quelles (voir l'en-tête de `globals.css`). Ils suivent la teinte
 * principale, comme dans les six thèmes livrés.
 */
const BASE_CHART: Record<string, string> = {
  "chart-etape-1": "#0b1f3a",
  "chart-etape-2": "#1b4781",
  "chart-etape-3": "#3263a6",
  "chart-etape-4": "#5787cb",
  "chart-etape-5": "#7ea7e0",
  "chart-barre": "#3263a6",
  "chart-piste": "#d5e6fe",
  "chart-grille": "#cedef4",
};

/** `--color-surface-container-lowest` reste blanc dans tous les thèmes : non listé. */

function canauxVersOklch(canaux: string): Oklch {
  const [r, g, b] = canaux.split(" ").map(Number);
  return rgbToOklch({ r, g, b });
}

function reteinter(base: Oklch, teinte: number): Oklch {
  return { l: base.l, c: base.c, h: teinte };
}

export interface CouleursTheme {
  /** Couleur principale du logo, en hexadécimal. */
  couleur: string;
  /** Accent. Absent → la famille secondaire suit la teinte principale. */
  accent?: string | null;
}

/**
 * Palette complète pour une couleur de logo, prête à être posée sur `<html>`.
 *
 * Les clés sont les noms de propriétés personnalisées (`--color-primary`), les
 * valeurs leur contenu. Rien n'est écrit ici : l'appelant décide de la portée.
 *
 * Renvoie `null` si la couleur n'est pas un hexadécimal valide — l'appelant
 * garde alors la palette de base plutôt que d'appliquer un thème à moitié
 * calculé.
 */
export function paletteDepuisCouleur({ couleur, accent }: CouleursTheme): Record<
  string,
  string
> | null {
  const principale = parseHex(couleur);
  if (!principale) return null;

  const teinte = rgbToOklch(principale).h;
  // Accent absent, illisible, ou trop proche du gris : la famille secondaire
  // suit la teinte principale. C'est un accent ANALOGUE, exactement ce que font
  // « émeraude », « océan » et « améthyste » parmi les thèmes livrés.
  const rgbAccent = accent ? parseHex(accent) : null;
  const teinteAccent = rgbAccent ? rgbToOklch(rgbAccent).h : teinte;

  const palette: Record<string, string> = {};

  for (const [nom, canaux] of Object.entries(BASE_PRIMAIRE)) {
    palette[`--color-${nom}`] = toChannels(oklchToRgb(reteinter(canauxVersOklch(canaux), teinte)));
  }
  for (const [nom, canaux] of Object.entries(BASE_SECONDAIRE)) {
    palette[`--color-${nom}`] = toChannels(
      oklchToRgb(reteinter(canauxVersOklch(canaux), teinteAccent)),
    );
  }
  for (const [nom, hex] of Object.entries(BASE_CHART)) {
    const base = parseHex(hex);
    if (!base) continue;
    palette[`--${nom}`] = toHex(oklchToRgb(reteinter(rgbToOklch(base), teinte)));
  }

  return palette;
}

/**
 * Aperçu du thème pour le sélecteur : les trois couleurs que la miniature peint.
 *
 * Même calcul que la palette, restreint aux trois jetons affichés — le sélecteur
 * montre donc le thème réel, pas une approximation dessinée à la main.
 */
export function apercuDepuisCouleur(
  couleurs: CouleursTheme,
): { primaire: string; accent: string; fond: string } | null {
  const palette = paletteDepuisCouleur(couleurs);
  if (!palette) return null;

  const enHex = (jeton: string) => {
    const [r, g, b] = palette[jeton].split(" ").map(Number);
    return toHex({ r, g, b });
  };
  return {
    primaire: enHex("--color-primary"),
    accent: enHex("--color-secondary-container"),
    fond: enHex("--color-surface-container"),
  };
}
