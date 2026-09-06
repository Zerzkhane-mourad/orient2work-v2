import type { EntrepriseStatus } from "@prisma/client";
import type { Request, Response } from "express";
import { sendSuccess } from "../lib/http.js";
import { currentActor, requireProfileId } from "../middlewares/authorize.js";
import { body, params, query } from "../middlewares/validate.js";
import * as entrepriseService from "../services/entreprise.service.js";
import type {
  ListEntreprisesInput,
  UpdateEntrepriseInput,
} from "../validators/entreprise.validator.js";

export async function getMe(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await entrepriseService.getMyProfile(currentActor(req)));
}

export async function updateMe(req: Request, res: Response): Promise<void> {
  const actor = currentActor(req);
  const id = requireProfileId(actor);
  sendSuccess(
    res,
    await entrepriseService.updateProfile(actor, id, body<UpdateEntrepriseInput>(req)),
  );
}

export async function listPublic(req: Request, res: Response): Promise<void> {
  const result = await entrepriseService.listPublic(query<ListEntreprisesInput>(req));
  sendSuccess(res, result.items, 200, result.meta);
}

export async function getOne(req: Request, res: Response): Promise<void> {
  const { id } = params<{ id: string }>(req);
  const actor = req.user ? currentActor(req) : null;
  sendSuccess(res, await entrepriseService.getProfile(actor, id));
}

export async function listForAdmin(req: Request, res: Response): Promise<void> {
  const result = await entrepriseService.listForAdmin(query<ListEntreprisesInput>(req));
  sendSuccess(res, result.items, 200, result.meta);
}

export async function updateStatus(req: Request, res: Response): Promise<void> {
  const { id } = params<{ id: string }>(req);
  const { status, motif } = body<{ status: EntrepriseStatus; motif?: string }>(req);
  sendSuccess(res, await entrepriseService.updateStatus(id, status, motif));
}
