import type { Request, Response } from "express";
import { sendNoContent, sendSuccess } from "../lib/http.js";
import { currentActor } from "../middlewares/authorize.js";
import { body, params, query } from "../middlewares/validate.js";
import * as utilisateurService from "../services/utilisateur.service.js";
import type {
  CreateUtilisateurInput,
  ListUtilisateursInput,
  ResetUtilisateurPasswordInput,
  UpdateUtilisateurInput,
} from "../validators/utilisateur.validator.js";

export async function list(req: Request, res: Response): Promise<void> {
  const result = await utilisateurService.list(query<ListUtilisateursInput>(req));
  sendSuccess(res, result.items, 200, result.meta);
}

export async function getOne(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await utilisateurService.getOne(params<{ id: string }>(req).id));
}

export async function create(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await utilisateurService.create(body<CreateUtilisateurInput>(req)), 201);
}

export async function update(req: Request, res: Response): Promise<void> {
  const { id } = params<{ id: string }>(req);
  sendSuccess(
    res,
    await utilisateurService.update(currentActor(req), id, body<UpdateUtilisateurInput>(req)),
  );
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const { id } = params<{ id: string }>(req);
  const { password } = body<ResetUtilisateurPasswordInput>(req);
  sendSuccess(res, await utilisateurService.resetPassword(currentActor(req), id, password));
}

export async function remove(req: Request, res: Response): Promise<void> {
  await utilisateurService.remove(currentActor(req), params<{ id: string }>(req).id);
  sendNoContent(res);
}
