/** Client-side image handling for profile uploads (no backend in v1). */

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 Mo
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

export class ImageError extends Error {}

interface ResizeOptions {
  maxWidth: number;
  maxHeight: number;
  /** JPEG quality 0–1. */
  quality?: number;
}

/**
 * Validates a picked file and returns a resized, compressed data URL.
 *
 * Images are downscaled before encoding: a phone photo stored raw as base64
 * would exceed the localStorage quota, so we cap the dimensions and re-encode.
 */
export async function fileToResizedDataUrl(
  file: File,
  { maxWidth, maxHeight, quality = 0.85 }: ResizeOptions,
): Promise<string> {
  assertImageFile(file);

  const bitmap = await loadImage(file);
  const scale = Math.min(maxWidth / bitmap.width, maxHeight / bitmap.height, 1);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageError("Impossible de traiter l'image sur cet appareil.");

  // White backdrop so transparent PNGs don't turn black once encoded as JPEG.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);

  return canvas.toDataURL("image/jpeg", quality);
}

/** Mêmes règles que le backend : type et poids, vérifiés avant tout traitement. */
export function assertImageFile(file: File): void {
  if (!ACCEPTED.includes(file.type)) {
    throw new ImageError("Format non supporté. Utilisez une image JPG, PNG ou WebP.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ImageError("Image trop lourde. La taille maximale est de 5 Mo.");
  }
}

/** Zone à conserver, en pixels de l'image d'origine (après rotation). */
export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CropOptions {
  /** Rotation appliquée à l'image avant découpe, en degrés. */
  rotation?: number;
  /** Largeur maximale du résultat : une photo de téléphone n'a pas à partir en 4000 px. */
  maxWidth: number;
  /** Nom du fichier produit, extension comprise. */
  filename: string;
  quality?: number;
}

/**
 * Découpe une image selon la zone choisie dans le rogneur et renvoie un
 * `File` prêt à être envoyé à l'API.
 *
 * Le PNG reste PNG (transparence d'un logo) ; tout le reste part en JPEG, plus
 * léger pour une photo.
 */
export async function cropImage(
  src: string,
  area: CropArea,
  { rotation = 0, maxWidth, filename, quality = 0.9 }: CropOptions,
): Promise<File> {
  const image = await loadImageFromUrl(src);
  const radians = (rotation * Math.PI) / 180;

  // 1. L'image entière, tournée, sur un canevas assez grand pour la contenir.
  const sin = Math.abs(Math.sin(radians));
  const cos = Math.abs(Math.cos(radians));
  const rotatedWidth = image.naturalWidth * cos + image.naturalHeight * sin;
  const rotatedHeight = image.naturalWidth * sin + image.naturalHeight * cos;

  const rotated = document.createElement("canvas");
  rotated.width = Math.round(rotatedWidth);
  rotated.height = Math.round(rotatedHeight);
  const rctx = rotated.getContext("2d");
  if (!rctx) throw new ImageError("Impossible de traiter l'image sur cet appareil.");
  rctx.translate(rotatedWidth / 2, rotatedHeight / 2);
  rctx.rotate(radians);
  rctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);

  // 2. La zone retenue, réduite si besoin.
  const scale = Math.min(1, maxWidth / area.width);
  const width = Math.max(1, Math.round(area.width * scale));
  const height = Math.max(1, Math.round(area.height * scale));

  const output = document.createElement("canvas");
  output.width = width;
  output.height = height;
  const ctx = output.getContext("2d");
  if (!ctx) throw new ImageError("Impossible de traiter l'image sur cet appareil.");

  const png = filename.toLowerCase().endsWith(".png");
  if (!png) {
    // Fond blanc : un PNG transparent encodé en JPEG virerait au noir.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(rotated, area.x, area.y, area.width, area.height, 0, 0, width, height);

  const type = png ? "image/png" : "image/jpeg";
  const blob = await new Promise<Blob | null>((resolve) =>
    output.toBlob(resolve, type, quality),
  );
  if (!blob) throw new ImageError("Le recadrage de l'image a échoué.");

  return new File([blob], png ? filename : filename.replace(/\.[^.]+$/, "") + ".jpg", { type });
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new ImageError("Fichier image illisible."));
    reader.readAsDataURL(blob);
  });
}

function loadImageFromUrl(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new ImageError("Fichier image illisible."));
    img.src = src;
  });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new ImageError("Fichier image illisible."));
    };
    img.src = url;
  });
}
