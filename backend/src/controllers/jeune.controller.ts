import type { Request, Response } from "express";
import { sendSuccess } from "../lib/http.js";
import { currentActor, requireProfileId } from "../middlewares/authorize.js";
import { body, params, query } from "../middlewares/validate.js";
import * as jeuneService from "../services/jeune.service.js";
import * as entrepriseService from "../services/entreprise.service.js";
import type {
  ExperienceInput,
  ListJeunesInput,
  SearchTalentsInput,
  UpdateJeuneInput,
} from "../validators/jeune.validator.js";
import type { LienInput } from "../validators/jeune.validator.js";

export async function getMe(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await jeuneService.getMyProfile(currentActor(req)));
}

export async function updateMe(req: Request, res: Response): Promise<void> {
  const actor = currentActor(req);
  const jeuneId = requireProfileId(actor);
  sendSuccess(res, await jeuneService.updateProfile(actor, jeuneId, body<UpdateJeuneInput>(req)));
}

export async function getOne(req: Request, res: Response): Promise<void> {
  const { id } = params<{ id: string }>(req);
  const actor = req.user ? currentActor(req) : null;
  sendSuccess(res, await jeuneService.getProfile(actor, id));
}

// ── Expériences ──────────────────────────────────────────────────────────────

export async function addExperience(req: Request, res: Response): Promise<void> {
  const actor = currentActor(req);
  const jeuneId = requireProfileId(actor);
  sendSuccess(
    res,
    await jeuneService.addExperience(actor, jeuneId, body<ExperienceInput>(req)),
    201,
  );
}

export async function updateExperience(req: Request, res: Response): Promise<void> {
  const actor = currentActor(req);
  const jeuneId = requireProfileId(actor);
  const { itemId } = params<{ itemId: string }>(req);
  sendSuccess(
    res,
    await jeuneService.updateExperience(
      actor,
      jeuneId,
      itemId,
      body<Partial<ExperienceInput>>(req),
    ),
  );
}

export async function removeExperience(req: Request, res: Response): Promise<void> {
  const actor = currentActor(req);
  const jeuneId = requireProfileId(actor);
  const { itemId } = params<{ itemId: string }>(req);
  sendSuccess(res, await jeuneService.removeExperience(actor, jeuneId, itemId));
}

// ── Liens ────────────────────────────────────────────────────────────────────

export async function addLien(req: Request, res: Response): Promise<void> {
  const actor = currentActor(req);
  const jeuneId = requireProfileId(actor);
  sendSuccess(res, await jeuneService.addLien(actor, jeuneId, body<LienInput>(req)), 201);
}

export async function removeLien(req: Request, res: Response): Promise<void> {
  const actor = currentActor(req);
  const jeuneId = requireProfileId(actor);
  const { itemId } = params<{ itemId: string }>(req);
  sendSuccess(res, await jeuneService.removeLien(actor, jeuneId, itemId));
}

// ── Recherche de talents ─────────────────────────────────────────────────────

export async function searchTalents(req: Request, res: Response): Promise<void> {
  const actor = currentActor(req);
  const status = actor.profileId ? await entrepriseService.getStatus(actor.profileId) : null;
  const result = await jeuneService.searchTalents(actor, status, query<SearchTalentsInput>(req));
  sendSuccess(res, result.items, 200, result.meta);
}

// ── Administration ───────────────────────────────────────────────────────────

export async function listForAdmin(req: Request, res: Response): Promise<void> {
  const result = await jeuneService.listForAdmin(query<ListJeunesInput>(req));
  sendSuccess(res, result.items, 200, result.meta);
}

export async function updateStatus(req: Request, res: Response): Promise<void> {
  const { id } = params<{ id: string }>(req);
  const { status } = body<{ status: Parameters<typeof jeuneService.updateStatus>[1] }>(req);
  sendSuccess(res, await jeuneService.updateStatus(id, status));
}
