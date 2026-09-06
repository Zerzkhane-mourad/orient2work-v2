import type { DocumentType } from "@prisma/client";
import type { Request, Response } from "express";
import { ValidationError } from "../lib/errors.js";
import { sendNoContent, sendSuccess } from "../lib/http.js";
import { currentActor } from "../middlewares/authorize.js";
import { params, query } from "../middlewares/validate.js";
import * as documentService from "../services/document.service.js";
import type { ListDocumentsInput } from "../validators/notification.validator.js";

export async function upload(req: Request, res: Response): Promise<void> {
  if (!req.file) throw new ValidationError("Aucun fichier reçu.");
  const type = (req.params.type as DocumentType | undefined) ?? "AUTRE";
  sendSuccess(res, await documentService.upload(currentActor(req), type, req.file), 201);
}

export async function list(req: Request, res: Response): Promise<void> {
  const input = query<ListDocumentsInput>(req);
  const result = await documentService.list(currentActor(req), input.type, input);
  sendSuccess(res, result.items, 200, result.meta);
}

export async function download(req: Request, res: Response): Promise<void> {
  const { id } = params<{ id: string }>(req);
  const target = await documentService.download(currentActor(req), id);

  // `Content-Disposition: attachment` + `nosniff` : le fichier est téléchargé, il
  // n'est jamais interprété comme du HTML dans l'origine de l'API.
  res.setHeader("Content-Type", target.mimeType);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${encodeURIComponent(target.filename)}"`,
  );
  res.sendFile(target.absolutePath);
}

export async function remove(req: Request, res: Response): Promise<void> {
  const { id } = params<{ id: string }>(req);
  await documentService.remove(currentActor(req), id);
  sendNoContent(res);
}
