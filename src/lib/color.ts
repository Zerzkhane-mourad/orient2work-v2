/**
 * Mesure et manipulation de couleur en OKLCH.
 *
 * ── Pourquoi OKLCH et pas HSL ────────────────────────────────────────────────
 *
 * La palette de l'application est construite sur des contrastes VALIDÉS
 * (cf. l'en-tête de `globals.css`). Reteinter une palette sans casser ces
 * contrastes suppose un espace où la clarté est perceptuellement uniforme :
 * en HSL, `hsl(60 100% 50%)` (jaune) et `hsl(240 100% 50%)` (bleu) annoncent la
 * même « lightness » alors que le premier est ~11 fois plus lumineux. Toute
 * rotation de teinte en HSL déplace donc les contrastes de façon incontrôlée.
 *
 * En OKLCH, L est proche de la luminosité perçue : on peut changer H en gardant
 * L, et les rapports de contraste restent à quelques centièmes près ceux de la
 * palette d'origine. C'est exactement la méthode employée pour calculer les six
 * thèmes d'entreprise livrés en dur dans `globals.css` — ce module ne fait que
 * la rendre exécutable à la volée, pour une couleur quelconque.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface Oklch {
  /** Clarté perçue, 0 (noir) à 1 (blanc). */
  l: number;
  /** Chroma — 0 = gris. Au-delà de ~0,37 rien n'est représentable en sRGB. */
  c: number;
  /** Teinte en degrés, 0–360. */
  h: number;
}

// ── Entrées / sorties ────────────────────────────────────────────────────────

/** `#0b1f3a` ou `#abc` → canaux. `null` si la chaîne n'est pas un hex valide. */
export function parseHex(hex: string): Rgb | null {
  const clean = hex.trim().replace(/^#/, "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((char) => char + char)
          .join("")
      : clean;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

export function toHex({ r, g, b }: Rgb): string {
  const part = (value: number) =>
    Math.round(Math.min(255, Math.max(0, value)))
      .toString(16)
      .padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`;
}

/**
 * Forme attendue par les jetons `--color-*` : « r g b », sans `rgb()`.
 *
 * C'est la SEULE forme qui laisse fonctionner les modificateurs d'opacité de
 * Tailwind (`bg-primary/5`) — voir l'en-tête de `globals.css`.
 */
export function toChannels({ r, g, b }: Rgb): string {
  const part = (value: number) => Math.round(Math.min(255, Math.max(0, value)));
  return `${part(r)} ${part(g)} ${part(b)}`;
}

// ── Conversions ──────────────────────────────────────────────────────────────

function srgbToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(channel: number): number {
  const c = channel <= 0.0031308 ? channel * 12.92 : 1.055 * channel ** (1 / 2.4) - 0.055;
  return c * 255;
}

/** Matrices d'Ottosson (Oklab, 2020). */
export function rgbToOklch(rgb: Rgb): Oklch {
  const lr = srgbToLinear(rgb.r);
  const lg = srgbToLinear(rgb.g);
  const lb = srgbToLinear(rgb.b);

  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  const okL = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const okA = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const okB = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

  const hue = (Math.atan2(okB, okA) * 180) / Math.PI;
  return {
    l: okL,
    c: Math.sqrt(okA * okA + okB * okB),
    h: hue < 0 ? hue + 360 : hue,
  };
}

/** Sans écrêtage : les canaux peuvent sortir de 0–255 si la couleur est hors gamut. */
function oklchToRgbRaw({ l, c, h }: Oklch): Rgb {
  const radians = (h * Math.PI) / 180;
  const okA = c * Math.cos(radians);
  const okB = c * Math.sin(radians);

  const lCube = (l + 0.3963377774 * okA + 0.2158037573 * okB) ** 3;
  const mCube = (l - 0.1055613458 * okA - 0.0638541728 * okB) ** 3;
  const sCube = (l - 0.0894841775 * okA - 1.291485548 * okB) ** 3;

  return {
    r: linearToSrgb(4.0767416621 * lCube - 3.3077115913 * mCube + 0.2309699292 * sCube),
    g: linearToSrgb(-1.2684380046 * lCube + 2.6097574011 * mCube - 0.3413193965 * sCube),
    b: linearToSrgb(-0.0041960863 * lCube - 0.7034186147 * mCube + 1.707614701 * sCube),
  };
}

function inGamut(color: Oklch): boolean {
  const { r, g, b } = oklchToRgbRaw(color);
  // Tolérance d'un demi-niveau : l'arrondi final vers l'entier absorbe le reste.
  const ok = (value: number) => value >= -0.5 && value <= 255.5;
  return ok(r) && ok(g) && ok(b);
}

/**
 * OKLCH → sRGB, en ramenant la couleur dans le gamut si nécessaire.
 *
 * L'écrêtage porte sur la CHROMA seule, par dichotomie : la clarté et la teinte
 * sont conservées telles quelles. C'est ce qui protège la palette — le contraste
 * dépend presque entièrement de L, donc une couleur désaturée pour rentrer dans
 * le gamut garde le rapport de contraste validé. Écrêter naïvement les canaux
 * (`min(255, max(0, x))`), à l'inverse, déplace L de façon arbitraire.
 */
export function oklchToRgb(color: Oklch): Rgb {
  const normalized: Oklch = {
    l: Math.min(1, Math.max(0, color.l)),
    c: Math.max(0, color.c),
    h: ((color.h % 360) + 360) % 360,
  };

  if (!inGamut(normalized)) {
    let low = 0;
    let high = normalized.c;
    // 16 pas suffisent : l'intervalle initial vaut au plus ~0,4, on termine donc
    // sous 1e-5 de chroma, très en deçà d'un niveau de quantification 8 bits.
    for (let i = 0; i < 16; i += 1) {
      const mid = (low + high) / 2;
      if (inGamut({ ...normalized, c: mid })) low = mid;
      else high = mid;
    }
    normalized.c = low;
  }

  const { r, g, b } = oklchToRgbRaw(normalized);
  const clamp = (value: number) => Math.min(255, Math.max(0, value));
  return { r: clamp(r), g: clamp(g), b: clamp(b) };
}

/** Écart de teinte le plus court entre deux angles, 0–180. */
export function hueDistance(a: number, b: number): number {
  const diff = Math.abs(((a - b) % 360) + 360) % 360;
  return diff > 180 ? 360 - diff : diff;
}

// ── Extraction depuis un logo ────────────────────────────────────────────────

/** Couleur retenue dans un logo, avec le poids qui l'a fait élire. */
export interface Swatch {
  hex: string;
  oklch: Oklch;
  /** Part de l'image occupée, 0–1 — diagnostic, jamais affiché tel quel. */
  part: number;
}

/**
 * Sous ce seuil de chroma une couleur ne se lit plus COMME une teinte : c'est un
 * gris. Un logo noir et blanc n'en contient aucune au-dessus, d'où le repli
 * documenté dans `extraireCouleurs`.
 */
const CHROMA_MINIMALE = 0.04;

/** Les extrêmes portent le fond et le trait, pas l'identité de la marque. */
const CLARTE_MIN = 0.16;
const CLARTE_MAX = 0.94;

/** Deux teintes plus proches que cela racontent la même chose. */
const ECART_TEINTE_MIN = 25;

/**
 * Couleurs dominantes d'un logo, les plus saturées d'abord.
 *
 * ── Ce qui est mesuré, et pourquoi ───────────────────────────────────────────
 *
 * Un logo n'est pas une photo : il est très majoritairement composé de fond
 * (blanc ou transparent) et de texte (noir). Classer les pixels par fréquence
 * brute renverrait donc « blanc » pour presque toutes les marques. Le tri se
 * fait ici sur `part × chroma` : une pastille rouge sur 8 % de la surface pèse
 * plus qu'un fond blanc sur 80 %, ce qui correspond à la couleur qu'un humain
 * nommerait en regardant le logo.
 *
 * Les pixels sont regroupés par secteur de teinte (24 secteurs de 15°) plutôt
 * que par valeur exacte : un dégradé ou un anti-aliasing produit des centaines
 * de rouges légèrement différents qui, comptés séparément, perdraient chacun
 * contre un aplat secondaire.
 *
 * Renvoie un tableau vide si le logo est achromatique — l'appelant décide alors
 * du repli plutôt que de recevoir un gris déguisé en couleur de marque.
 */
export function extraireCouleurs(source: CanvasImageSource, maximum = 4): Swatch[] {
  const TAILLE = 72; // Assez pour un aplat de quelques pour cent, assez peu pour rester instantané.
  const canvas = document.createElement("canvas");
  canvas.width = TAILLE;
  canvas.height = TAILLE;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];
  ctx.drawImage(source, 0, 0, TAILLE, TAILLE);

  let pixels: Uint8ClampedArray;
  try {
    pixels = ctx.getImageData(0, 0, TAILLE, TAILLE).data;
  } catch {
    // Canevas souillé : l'image vient d'une origine tierce sans CORS. Sans
    // couleur lisible, l'appelant garde son thème actuel.
    return [];
  }

  const SECTEURS = 24;
  const buckets = new Map<number, { l: number; c: number; sin: number; cos: number; n: number }>();
  let retenus = 0;

  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = pixels[i + 3];
    // Un bord anti-aliasé mélange la couleur au fond : il ment sur la teinte.
    if (alpha < 250) continue;

    const couleur = rgbToOklch({ r: pixels[i], g: pixels[i + 1], b: pixels[i + 2] });
    retenus += 1;
    if (couleur.c < CHROMA_MINIMALE) continue;
    if (couleur.l < CLARTE_MIN || couleur.l > CLARTE_MAX) continue;

    const secteur = Math.floor((couleur.h / 360) * SECTEURS) % SECTEURS;
    const bucket = buckets.get(secteur) ?? { l: 0, c: 0, sin: 0, cos: 0, n: 0 };
    bucket.l += couleur.l;
    bucket.c += couleur.c;
    // La teinte est un ANGLE : la moyenne se fait sur le cercle, sinon 350° et
    // 10° — deux rouges voisins — donneraient 180°, un cyan.
    const radians = (couleur.h * Math.PI) / 180;
    bucket.sin += Math.sin(radians);
    bucket.cos += Math.cos(radians);
    bucket.n += 1;
    buckets.set(secteur, bucket);
  }

  if (retenus === 0 || buckets.size === 0) return [];

  const candidats = [...buckets.values()]
    .map((bucket) => {
      const hue = (Math.atan2(bucket.sin / bucket.n, bucket.cos / bucket.n) * 180) / Math.PI;
      const oklch: Oklch = {
        l: bucket.l / bucket.n,
        c: bucket.c / bucket.n,
        h: hue < 0 ? hue + 360 : hue,
      };
      return { oklch, part: bucket.n / retenus, poids: (bucket.n / retenus) * oklch.c };
    })
    .sort((a, b) => b.poids - a.poids);

  // Secteurs voisins fusionnés : un logo bleu dont l'aplat chevauche deux
  // secteurs ne doit pas produire « bleu » ET « bleu » comme deux couleurs.
  const retenues: Swatch[] = [];
  for (const candidat of candidats) {
    if (retenues.length >= maximum) break;
    const proche = retenues.some(
      (deja) => hueDistance(deja.oklch.h, candidat.oklch.h) < ECART_TEINTE_MIN,
    );
    if (proche) continue;
    retenues.push({
      hex: toHex(oklchToRgb(candidat.oklch)),
      oklch: candidat.oklch,
      part: candidat.part,
    });
  }

  return retenues;
}

/** Charge un fichier image puis en extrait les couleurs dominantes. */
export async function couleursDuFichier(file: File, maximum = 4): Promise<Swatch[]> {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Fichier image illisible."));
      img.src = url;
    });
    return extraireCouleurs(image, maximum);
  } finally {
    URL.revokeObjectURL(url);
  }
}
