/**
 * Réception de fichiers (CV, logo, photo).
 *
 * Défenses appliquées :
 *  • stockage sur disque HORS du répertoire servi statiquement — aucun fichier
 *    déposé n'est atteignable par URL directe ni exécutable par le serveur web ;
 *  • nom de fichier généré aléatoirement (jamais dérivé de l'entrée utilisateur),
 *    ce qui neutralise les traversées de chemin type `../../.env` ;
 *  • whitelist stricte de types MIME **et** d'extensions, avec vérification de la
 *    signature binaire (magic bytes) après écriture : un `.pdf` qui est en réalité
 *    un exécutable est supprimé ;
 *  • taille plafonnée par multer et par la configuration.
 */
import { createReadStream } from "node:fs";
import { mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import multer, { type FileFilterCallback } from "multer";
import type { Request } from "express";
import { DocumentType } from "@prisma/client";
import { env } from "../config/env.js";
import { PayloadTooLargeError, UnsupportedMediaTypeError } from "./errors.js";

export const UPLOAD_ROOT = path.resolve(process.cwd(), env.UPLOAD_DIR);

/** Types autorisés par usage. Toute autre valeur est rejetée en 415. */
const ALLOWED: Record<DocumentType, { mimes: string[]; extensions: string[] }> = {
  [DocumentType.CV]: {
    mimes: ["application/pdf"],
    extensions: [".pdf"],
  },
  [DocumentType.PHOTO]: {
    mimes: ["image/jpeg", "image/png", "image/webp"],
    extensions: [".jpg", ".jpeg", ".png", ".webp"],
  },
  [DocumentType.BANNIERE]: {
    mimes: ["image/jpeg", "image/png", "image/webp"],
    extensions: [".jpg", ".jpeg", ".png", ".webp"],
  },
  [DocumentType.LOGO]: {
    mimes: ["image/jpeg", "image/png", "image/webp", "image/svg+xml"],
    // SVG exclu volontairement : un SVG peut embarquer du JavaScript (XSS stocké).
    extensions: [".jpg", ".jpeg", ".png", ".webp"],
  },
  [DocumentType.FORMATION]: {
    // Couverture de cours : servie publiquement, donc surtout pas de SVG — un SVG
    // peut embarquer du JavaScript, et il serait ici rendu sans authentification.
    mimes: ["image/jpeg", "image/png", "image/webp"],
    extensions: [".jpg", ".jpeg", ".png", ".webp"],
  },
  [DocumentType.AUTRE]: {
    mimes: ["application/pdf", "image/jpeg", "image/png"],
    extensions: [".pdf", ".jpg", ".jpeg", ".png"],
  },
};

/** Signatures binaires attendues, vérifiées après écriture. */
const MAGIC_BYTES: Array<{ mime: string; bytes: number[] }> = [
  { mime: "application/pdf", bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF
];

export async function ensureUploadDir(): Promise<void> {
  await mkdir(UPLOAD_ROOT, { recursive: true });
}

export function storedPath(storedName: string): string {
  // `basename` neutralise toute tentative de traversée si l'appelant passe un
  // nom issu d'une entrée utilisateur.
  return path.join(UPLOAD_ROOT, path.basename(storedName));
}

function buildFilter(type: DocumentType) {
  return (_req: Request, file: Express.Multer.File, callback: FileFilterCallback): void => {
    const rules = ALLOWED[type];
    const extension = path.extname(file.originalname).toLowerCase();
    if (!rules.mimes.includes(file.mimetype) || !rules.extensions.includes(extension)) {
      callback(
        new UnsupportedMediaTypeError(
          `Format non autorisé. Extensions acceptées : ${rules.extensions.join(", ")}.`,
        ),
      );
      return;
    }
    callback(null, true);
  };
}

/** Construit un middleware multer pour un usage donné (un seul fichier). */
export function uploadSingle(type: DocumentType, field = "file") {
  return multer({
    storage: multer.diskStorage({
      destination: (_req, _file, callback) => {
        void ensureUploadDir()
          .then(() => callback(null, UPLOAD_ROOT))
          .catch((error: Error) => callback(error, UPLOAD_ROOT));
      },
      filename: (_req, file, callback) => {
        // Nom 100 % généré : l'extension provient de la whitelist, pas du client.
        const extension = path.extname(file.originalname).toLowerCase();
        callback(null, `${randomUUID()}${extension}`);
      },
    }),
    limits: { fileSize: env.UPLOAD_MAX_SIZE_BYTES, files: 1, fields: 10 },
    fileFilter: buildFilter(type),
  }).single(field);
}

/** Nom d'origine assaini : conservé pour l'affichage et le nom de téléchargement. */
export function sanitizeFilename(original: string): string {
  const base = path.basename(original).replace(/[^\w.\- ]+/g, "_");
  return base.slice(0, 120) || "fichier";
}

/**
 * Vérifie que le contenu réel correspond au type MIME annoncé. Le fichier est
 * supprimé si ce n'est pas le cas.
 */
export async function assertRealFileType(filePath: string, mimeType: string): Promise<void> {
  const expected = MAGIC_BYTES.find((entry) => entry.mime === mimeType);
  if (!expected) return;

  const header = await readHeader(filePath, expected.bytes.length);
  const matches = expected.bytes.every((byte, index) => header[index] === byte);
  if (!matches) {
    await unlink(filePath).catch(() => undefined);
    throw new UnsupportedMediaTypeError("Le contenu du fichier ne correspond pas à son extension.");
  }
}

function readHeader(filePath: string, length: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const stream = createReadStream(filePath, { start: 0, end: length - 1 });
    const chunks: Buffer[] = [];
    stream.on("data", (chunk) => chunks.push(chunk as Buffer));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

export async function removeStoredFile(storedName: string): Promise<void> {
  await unlink(storedPath(storedName)).catch(() => undefined);
}

/** Traduit les erreurs multer en erreurs applicatives (pas de fuite interne). */
export function normalizeMulterError(error: unknown): unknown {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return new PayloadTooLargeError(
        `Fichier trop volumineux (maximum ${Math.round(env.UPLOAD_MAX_SIZE_BYTES / 1024 / 1024)} Mo).`,
      );
    }
    return new UnsupportedMediaTypeError("Fichier rejeté.");
  }
  return error;
}
