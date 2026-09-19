/**
 * Certificat de réussite, rempli sur le modèle PDF officiel.
 *
 * Le modèle (`assets/certificat/modele.pdf`) porte déjà le décor, les textes
 * fixes, la signature et le cachet : on n'écrit QUE dans ses blancs. Les
 * positions ci-dessous ont été relevées sur ce fichier (A4 paysage,
 * 842 × 595 pt) ; remplacer le modèle impose de les revérifier.
 *
 * Polices embarquées (licence OFL) : Cormorant Garamond, celle du modèle, et
 * Yeseva One pour le nom, comme sur la maquette.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";

const ASSETS = path.resolve(process.cwd(), "assets/certificat");

export interface CertificatData {
  nomComplet: string;
  formation: string;
  /** Date de délivrance, déjà découpée dans le fuseau de l'application. */
  date: { jour: string; mois: string; annee: string };
  /** Numéro séquentiel, sans préfixe. */
  numero: string;
}

const NOIR = rgb(0, 0, 0);
const OR = rgb(0.851, 0.671, 0.329);
/** Bleu des vagues du modèle (#364FA3). */
const BLEU = rgb(0.212, 0.31, 0.639);

/** Chargés une fois : le modèle et les polices pèsent près de 3 Mo. */
let assets: Promise<{
  modele: Buffer;
  regular: Buffer;
  italic: Buffer;
  nom: Buffer;
}> | null = null;

function loadAssets() {
  assets ??= Promise.all([
    readFile(path.join(ASSETS, "modele.pdf")),
    readFile(path.join(ASSETS, "polices/CormorantGaramond-Regular.ttf")),
    readFile(path.join(ASSETS, "polices/CormorantGaramond-BoldItalic.ttf")),
    readFile(path.join(ASSETS, "polices/YesevaOne-Regular.ttf")),
  ]).then(([modele, regular, italic, nom]) => ({ modele, regular, italic, nom }));
  // Un échec de lecture ne doit pas rester en cache pour toute la vie du processus.
  assets.catch(() => (assets = null));
  return assets;
}

export async function renderCertificat(data: CertificatData): Promise<Uint8Array> {
  const files = await loadAssets();
  const pdf = await PDFDocument.load(files.modele);
  pdf.registerFontkit(fontkit);

  // `subset` : seuls les glyphes utilisés sont embarqués, le fichier reste léger.
  const regular = await pdf.embedFont(files.regular, { subset: true });
  const italic = await pdf.embedFont(files.italic, { subset: true });
  const display = await pdf.embedFont(files.nom, { subset: true });

  const page = pdf.getPage(0);
  // Les relevés sont exprimés depuis le HAUT de la page ; pdf-lib compte depuis
  // le bas. La MediaBox du modèle ne part pas de 0 (y ∈ [8.58, 604.08]) : c'est
  // son bord supérieur réel qui sert de référence.
  const box = page.getMediaBox();
  const fromTop = (y: number) => box.y + box.height - y;

  /* ── Nom : centré entre « DÉCERNÉ À » et « Pour avoir suivi… » ─────────── */
  const nom = data.nomComplet.toLocaleUpperCase("fr-FR");
  const nomSize = fitSize(display, nom, 620, 40, 20);
  drawCentered(page, display, nom, nomSize, fromTop(238 + nomSize * 0.36), OR);

  /* ── Titre de la formation : dans le blanc sous « … la formation : » ──── */
  drawTitre(page, italic, data.formation, fromTop);

  /* ── Date de délivrance : les « / » sont imprimés dans le modèle ──────── */
  const dateY = fromTop(457.9);
  drawCentered(page, regular, data.date.jour, 16, dateY, NOIR, 232);
  drawCentered(page, regular, data.date.mois, 16, dateY, NOIR, 257.1);
  page.drawText(data.date.annee, { x: 275, y: dateY, size: 16, font: regular, color: NOIR });

  /* ── Référence : O2W-CERT-[ANNÉE]-[NUMÉRO] ─────────────────────────────── */
  const refY = fromTop(491.8);
  drawCentered(page, regular, data.date.annee, 16, refY, NOIR, 193);
  page.drawText(data.numero, { x: 216.5, y: refY, size: 16, font: regular, color: NOIR });

  pdf.setTitle(`Certificat Orient2Work — ${data.formation}`);
  pdf.setAuthor("Orient2Work");
  pdf.setSubject(`Certificat de réussite décerné à ${data.nomComplet}`);

  return pdf.save();
}

/**
 * Titre de la formation : gras italique, dans le bleu du modèle, encadré de
 * deux filets dorés — il doit se lire comme l'objet du certificat, pas comme
 * une ligne du paragraphe.
 *
 * Le blanc disponible ne fait que ~33 pt de haut : une ligne tant que possible,
 * en réduisant le corps ; au-delà, deux lignes en petit corps, sans filets.
 */
function drawTitre(page: PDFPage, font: PDFFont, titre: string, fromTop: (y: number) => number) {
  const maxWidth = 560;
  const size = fitSize(font, titre, maxWidth, 22, 15);

  if (font.widthOfTextAtSize(titre, size) <= maxWidth) {
    const y = fromTop(310);
    drawCentered(page, font, titre, size, y, BLEU);
    drawOrnements(page, font.widthOfTextAtSize(titre, size), y + size * 0.3);
    return;
  }

  const [first, second] = splitInTwo(titre);
  const small = Math.min(
    fitSize(font, first, 640, 15, 9),
    fitSize(font, second, 640, 15, 9),
  );
  drawCentered(page, font, first, small, fromTop(301), BLEU);
  drawCentered(page, font, second, small, fromTop(301 + small * 1.05), BLEU);
}

/** Filet doré terminé par un losange, de part et d'autre du titre. */
function drawOrnements(page: PDFPage, textWidth: number, y: number) {
  const center = page.getWidth() / 2;
  const gap = 14;
  const length = 60;
  const r = 2.6;

  for (const side of [-1, 1]) {
    const inner = center + side * (textWidth / 2 + gap);
    const outer = inner + side * length;
    page.drawLine({
      start: { x: inner, y },
      end: { x: outer, y },
      thickness: 0.8,
      color: OR,
    });
    // Losange côté titre.
    page.drawSvgPath(`M 0 ${-r} L ${r} 0 L 0 ${r} L ${-r} 0 Z`, {
      x: inner,
      y,
      color: OR,
    });
    // Point à l'extrémité.
    page.drawCircle({ x: outer, y, size: 1.1, color: OR });
  }
}

/** Coupe au mot le plus proche du milieu. */
function splitInTwo(text: string): [string, string] {
  const middle = text.length / 2;
  let cut = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === " " && (cut < 0 || Math.abs(i - middle) < Math.abs(cut - middle))) cut = i;
  }
  if (cut < 0) return [text, ""];
  return [text.slice(0, cut), text.slice(cut + 1)];
}

/** Plus grand corps, entre `max` et `min`, pour lequel le texte tient dans `width`. */
function fitSize(font: PDFFont, text: string, width: number, max: number, min: number): number {
  const natural = font.widthOfTextAtSize(text, max);
  if (natural <= width) return max;
  return Math.max(min, Math.floor(((max * width) / natural) * 10) / 10);
}

function drawCentered(
  page: PDFPage,
  font: PDFFont,
  text: string,
  size: number,
  y: number,
  color: ReturnType<typeof rgb>,
  centerX = page.getWidth() / 2,
) {
  if (!text) return;
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: centerX - width / 2, y, size, font, color });
}
