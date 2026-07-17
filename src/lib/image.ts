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
  if (!ACCEPTED.includes(file.type)) {
    throw new ImageError("Format non supporté. Utilisez une image JPG, PNG ou WebP.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ImageError("Image trop lourde. La taille maximale est de 5 Mo.");
  }

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
