import type { Request, Response } from "express";
import { PERMISSION_GROUPS } from "../domain/permissions.js";
import { sendNoContent, sendSuccess } from "../lib/http.js";
import { body, params, query } from "../middlewares/validate.js";
import * as roleService from "../services/role-admin.service.js";
import type {
  CreateRoleInput,
  ListRolesInput,
  UpdateRoleInput,
} from "../validators/role-admin.validator.js";

/**
 * Catalogue des permissions, servi tel quel.
 *
 * Le back-office dessine sa matrice de cases à cocher à partir de cette réponse
 * plutôt que d'une liste recopiée dans le frontend : une permission ajoutée au
 * serveur apparaît à l'écran sans redéploiement du client, et surtout les deux
 * ne peuvent pas diverger.
 */
export function permissions(_req: Request, res: Response): void {
  sendSuccess(res, PERMISSION_GROUPS);
}

export async function list(req: Request, res: Response): Promise<void> {
  const result = await roleService.list(query<ListRolesInput>(req));
  sendSuccess(res, result.items, 200, result.meta);
}

export async function getOne(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await roleService.getOne(params<{ id: string }>(req).id));
}

export async function create(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await roleService.create(body<CreateRoleInput>(req)), 201);
}

export async function update(req: Request, res: Response): Promise<void> {
  const { id } = params<{ id: string }>(req);
  sendSuccess(res, await roleService.update(id, body<UpdateRoleInput>(req)));
}

export async function remove(req: Request, res: Response): Promise<void> {
  await roleService.remove(params<{ id: string }>(req).id);
  sendNoContent(res);
}
