/**
 * Documents (CV, photo, logo, bannière).
 *
 * Le fichier n'est jamais servi statiquement : chaque téléchargement repasse par
 * ce service, qui vérifie l'identité du demandeur. Un CV n'est visible que par son
 * propriétaire, par une entreprise à qui il a été envoyé via une candidature, ou
 * par un admin.
 */
import { DocumentType, Role } from "@prisma/client";
import { ConflictError, ForbiddenError, NotFoundError } from "../lib/errors.js";
import { buildMeta, toSkipTake, type Pagination } from "../lib/pagination.js";
import { prisma } from "../lib/prisma.js";
import {
  assertRealFileType,
  removeStoredFile,
  sanitizeFilename,
  storedPath,
} from "../lib/upload.js";
import { isAdmin, type Actor } from "../middlewares/authorize.js";
import * as repository from "../repositories/document.repository.js";
import { toDocumentDto, type DocumentDto } from "../mappers/notification.mapper.js";
import { env } from "../config/env.js";
import type { ApiMeta } from "../lib/http.js";

export async function upload(
  actor: Actor,
  type: DocumentType,
  file: Express.Multer.File,
): Promise<DocumentDto> {
  // Contrôle du contenu réel : un fichier renommé en `.pdf` est supprimé ici.
  await assertRealFileType(file.path, file.mimetype);

  const document = await repository.createDocument({
    ownerId: actor.id,
    type,
    filename: sanitizeFilename(file.originalname),
    storedName: file.filename,
    mimeType: file.mimetype,
    size: file.size,
  });

  // Photo / bannière / logo : le profil pointe vers la route protégée.
  const url = `${env.API_PREFIX}/documents/${document.id}/contenu`;
  if (actor.profileId) {
    if (type === DocumentType.PHOTO && actor.role === Role.JEUNE) {
      await prisma.jeune.update({ where: { id: actor.profileId }, data: { photo: url } });
    } else if (type === DocumentType.BANNIERE && actor.role === Role.JEUNE) {
      await prisma.jeune.update({ where: { id: actor.profileId }, data: { banniere: url } });
    } else if (type === DocumentType.LOGO && actor.role === Role.ENTREPRISE) {
      await prisma.entreprise.update({ where: { id: actor.profileId }, data: { logo: url } });
    }
  }

  return toDocumentDto(document, env.API_PREFIX);
}

export async function list(
  actor: Actor,
  types: DocumentType[] | undefined,
  pagination: Pagination,
): Promise<{ items: DocumentDto[]; meta: ApiMeta }> {
  const { skip, take } = toSkipTake(pagination);
  const [rows, total] = await repository.listDocuments(actor.id, types, skip, take);
  return {
    items: rows.map((row) => toDocumentDto(row, env.API_PREFIX)),
    meta: buildMeta(pagination, total),
  };
}

export interface DownloadTarget {
  absolutePath: string;
  filename: string;
  mimeType: string;
}

export async function download(actor: Actor, id: string): Promise<DownloadTarget> {
  const document = await repository.findDocumentById(id);
  if (!document) throw new NotFoundError("Document introuvable.");

  await assertCanRead(actor, document.id, document.ownerId, document.type);

  return {
    absolutePath: storedPath(document.storedName),
    filename: document.filename,
    mimeType: document.mimeType,
  };
}

export async function remove(actor: Actor, id: string): Promise<void> {
  const document = await repository.findDocumentById(id);
  if (!document) throw new NotFoundError("Document introuvable.");
  if (!isAdmin(actor) && document.ownerId !== actor.id) {
    throw new NotFoundError("Document introuvable.");
  }

  // Un CV déjà transmis à un recruteur ne peut pas disparaître de son dossier.
  const used = await repository.countCandidaturesUsingDocument(id);
  if (used > 0) {
    throw new ConflictError(
      "Ce CV est joint à une candidature en cours et ne peut pas être supprimé.",
    );
  }

  await repository.deleteDocument(id);
  await removeStoredFile(document.storedName);
}

/**
 * Règles de lecture :
 *  • propriétaire et admin : toujours ;
 *  • images de profil (photo, bannière, logo) : lisibles par tout utilisateur
 *    authentifié — ce sont des éléments d'affichage publics ;
 *  • CV : uniquement l'entreprise ayant reçu une candidature portant ce CV.
 */
async function assertCanRead(
  actor: Actor,
  documentId: string,
  ownerId: string,
  type: DocumentType,
): Promise<void> {
  if (isAdmin(actor) || ownerId === actor.id) return;

  if (type === DocumentType.PHOTO || type === DocumentType.BANNIERE || type === DocumentType.LOGO) {
    return;
  }

  if (actor.role === Role.ENTREPRISE && actor.profileId) {
    const shared = await prisma.candidature.count({
      where: { cvId: documentId, offre: { entrepriseId: actor.profileId } },
    });
    if (shared > 0) return;
  }

  throw new ForbiddenError("Vous n'avez pas accès à ce document.");
}
