import type { Request, Response } from "express";
import { sendSuccess } from "../lib/http.js";
import * as adminService from "../services/admin.service.js";
import * as offreService from "../services/offre.service.js";

export async function stats(_req: Request, res: Response): Promise<void> {
  sendSuccess(res, await adminService.getStats());
}

/** Maintenance : bascule les offres dont la date limite est dépassée. */
export async function expireOffres(_req: Request, res: Response): Promise<void> {
  sendSuccess(res, { expirees: await offreService.expireOutdated() });
}
