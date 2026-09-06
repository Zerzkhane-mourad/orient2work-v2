import type { Request, Response } from "express";
import { sendNoContent, sendSuccess } from "../lib/http.js";
import { currentActor } from "../middlewares/authorize.js";
import { params, query } from "../middlewares/validate.js";
import * as notificationService from "../services/notification.service.js";
import type { ListNotificationsInput } from "../validators/notification.validator.js";

export async function list(req: Request, res: Response): Promise<void> {
  const input = query<ListNotificationsInput>(req);
  const result = await notificationService.list(
    currentActor(req),
    input,
    input.unreadOnly ?? false,
  );
  sendSuccess(res, { items: result.items, unread: result.unread }, 200, result.meta);
}

export async function markRead(req: Request, res: Response): Promise<void> {
  const { id } = params<{ id: string }>(req);
  sendSuccess(res, await notificationService.markRead(currentActor(req), id));
}

export async function markAllRead(req: Request, res: Response): Promise<void> {
  sendSuccess(res, await notificationService.markAllRead(currentActor(req)));
}

export async function remove(req: Request, res: Response): Promise<void> {
  const { id } = params<{ id: string }>(req);
  await notificationService.remove(currentActor(req), id);
  sendNoContent(res);
}
