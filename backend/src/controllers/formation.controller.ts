import type { Request, Response } from "express";
import { sendNoContent, sendSuccess } from "../lib/http.js";
import { ValidationError } from "../lib/errors.js";
import { currentActor } from "../middlewares/authorize.js";
import { body, params, query } from "../middlewares/validate.js";
import { paginationSchema } from "../lib/pagination.js";
import * as formationService from "../services/formation.service.js";
import type {
  CreateAvisInput,
  CreateFormationInput,
  ListFormationsInput,
  SubmitFormationQuizInput,
  QuizQuestionInput,
  UpdateFormationInput,
  UpdateFormationQuizInput,
  UpdateProgressionInput,
  UpdateQuizQuestionInput,
} from "../validators/formation.validator.js";

export async function list(req: Request, res: Response): Promise<void> {
  const actor = req.user ? currentActor(req) : null;
  const result = await formationService.list(actor, query<ListFormationsInput>(req));
  sendSuccess(res, result.items, 200, result.meta);
}

export async function getOne(req: Request, res: Response): Promise<void> {
  const { id } = params<{ id: string }>(req);
  const actor = req.user ? currentActor(req) : null;
  sendSuccess(res, await formationService.getOne(actor, id));
}

export async function create(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await formationService.create(body<CreateFormationInput>(req)), 201);
}

export async function update(req: Request, res: Response): Promise<void> {
  const { id } = params<{ id: string }>(req);
  sendSuccess(res, await formationService.update(id, body<UpdateFormationInput>(req)));
}

export async function remove(req: Request, res: Response): Promise<void> {
  const { id } = params<{ id: string }>(req);
  await formationService.remove(id);
  sendNoContent(res);
}

export async function updateProgression(req: Request, res: Response): Promise<void> {
  const { id } = params<{ id: string }>(req);
  sendSuccess(
    res,
    await formationService.updateProgression(
      currentActor(req),
      id,
      body<UpdateProgressionInput>(req),
    ),
  );
}

export async function submitQuiz(req: Request, res: Response): Promise<void> {
  const { id } = params<{ id: string }>(req);
  sendSuccess(
    res,
    await formationService.submitQuiz(currentActor(req), id, body<SubmitFormationQuizInput>(req)),
  );
}

export async function listAvis(req: Request, res: Response): Promise<void> {
  const { id } = params<{ id: string }>(req);
  const pagination = paginationSchema.parse(req.query);
  const result = await formationService.listAvis(id, pagination);
  // `mesVotes` évite un second aller-retour pour savoir quels avis le lecteur a
  // déjà marqués « utiles ». Vide pour un visiteur anonyme.
  const mesVotes = req.user ? await formationService.listMyAvisUtiles(currentActor(req), id) : [];
  sendSuccess(res, { items: result.items, mesVotes }, 200, result.meta);
}

export async function toggleAvisUtile(req: Request, res: Response): Promise<void> {
  const { id, itemId } = params<{ id: string; itemId: string }>(req);
  sendSuccess(res, await formationService.toggleAvisUtile(currentActor(req), id, itemId));
}

export async function upsertAvis(req: Request, res: Response): Promise<void> {
  const { id } = params<{ id: string }>(req);
  sendSuccess(
    res,
    await formationService.upsertAvis(currentActor(req), id, body<CreateAvisInput>(req)),
    201,
  );
}

export async function removeAvis(req: Request, res: Response): Promise<void> {
  const { itemId } = params<{ itemId: string }>(req);
  await formationService.removeAvis(currentActor(req), itemId);
  sendNoContent(res);
}

// ── Couverture ───────────────────────────────────────────────────────────────

export async function uploadImage(req: Request, res: Response): Promise<void> {
  const { id } = params<{ id: string }>(req);
  if (!req.file) throw new ValidationError("Aucun fichier reçu.");
  sendSuccess(res, await formationService.uploadImage(currentActor(req), id, req.file));
}

export async function uploadMedia(req: Request, res: Response): Promise<void> {
  if (!req.file) throw new ValidationError("Aucun fichier reçu.");
  sendSuccess(res, await formationService.uploadMedia(currentActor(req), req.file), 201);
}

/** Sert une illustration de cours — voir `getImage` pour le choix de l'accès. */
export async function getMedia(req: Request, res: Response): Promise<void> {
  const { id } = params<{ id: string }>(req);
  const target = await formationService.getMedia(id);

  res.setHeader("Content-Type", target.mimeType);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Disposition", "inline");
  // Le nom stocké est aléatoire et ne change jamais pour un identifiant donné :
  // l'image peut être mise en cache longuement.
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.sendFile(target.absolutePath);
}

/**
 * Sert la couverture, SANS authentification.
 *
 * `inline` et non `attachment` : c'est une image à afficher dans une page, pas
 * un fichier à télécharger. `nosniff` reste indispensable — il empêche le
 * navigateur de réinterpréter le contenu comme du HTML dans l'origine de l'API.
 */
export async function getImage(req: Request, res: Response): Promise<void> {
  const { id } = params<{ id: string }>(req);
  const target = await formationService.getImage(req.user ? currentActor(req) : null, id);

  res.setHeader("Content-Type", target.mimeType);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Disposition", "inline");
  // Le nom de fichier stocké est aléatoire et change à chaque remplacement :
  // l'URL reste stable, on laisse donc le navigateur revalider.
  res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
  res.sendFile(target.absolutePath);
}

// ── Quiz : édition question par question ─────────────────────────────────────

export async function updateQuizMeta(req: Request, res: Response): Promise<void> {
  const { id } = params<{ id: string }>(req);
  sendSuccess(res, await formationService.updateQuizMeta(id, body<UpdateFormationQuizInput>(req)));
}

export async function removeQuiz(req: Request, res: Response): Promise<void> {
  const { id } = params<{ id: string }>(req);
  sendSuccess(res, await formationService.removeQuiz(id));
}

export async function addQuizQuestion(req: Request, res: Response): Promise<void> {
  const { id } = params<{ id: string }>(req);
  sendSuccess(res, await formationService.addQuizQuestion(id, body<QuizQuestionInput>(req)), 201);
}

export async function updateQuizQuestion(req: Request, res: Response): Promise<void> {
  const { id, questionId } = params<{ id: string; questionId: string }>(req);
  sendSuccess(
    res,
    await formationService.updateQuizQuestion(id, questionId, body<UpdateQuizQuestionInput>(req)),
  );
}

export async function removeQuizQuestion(req: Request, res: Response): Promise<void> {
  const { id, questionId } = params<{ id: string; questionId: string }>(req);
  sendSuccess(res, await formationService.removeQuizQuestion(id, questionId));
}
