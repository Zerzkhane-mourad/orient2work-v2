/**
 * Notifications.
 *
 * `notify` est utilisé par les autres services (candidature reçue, entretien
 * planifié, offre validée…). Un échec d'écriture ne doit jamais faire échouer
 * l'action métier qui l'a déclenché : la notification est accessoire.
 */
import { logger } from "../config/logger.js";
import { NotFoundError } from "../lib/errors.js";
import { buildMeta, toSkipTake, type Pagination } from "../lib/pagination.js";
import { assertUserOwnership, type Actor } from "../middlewares/authorize.js";
import * as repository from "../repositories/notification.repository.js";
import { toNotificationDto, type NotificationDto } from "../mappers/notification.mapper.js";
import type { ApiMeta } from "../lib/http.js";

export interface NotifyInput {
  userId: string;
  title: string;
  icon?: string;
  detail?: string;
  href?: string;
  accent?: boolean;
}

export async function notify(input: NotifyInput): Promise<void> {
  try {
    await repository.createNotification({
      userId: input.userId,
      title: input.title,
      icon: input.icon ?? "notifications",
      detail: input.detail ?? null,
      href: input.href ?? null,
      accent: input.accent ?? false,
    });
  } catch (error) {
    logger.error({ err: error, userId: input.userId }, "Échec de création d'une notification");
  }
}

export async function list(
  actor: Actor,
  pagination: Pagination,
  unreadOnly: boolean,
): Promise<{ items: NotificationDto[]; meta: ApiMeta; unread: number }> {
  const { skip, take } = toSkipTake(pagination);
  const [rows, total] = await repository.listNotifications(actor.id, unreadOnly, skip, take);
  const unread = await repository.countUnread(actor.id);
  return { items: rows.map(toNotificationDto), meta: buildMeta(pagination, total), unread };
}

export async function markRead(actor: Actor, id: string): Promise<NotificationDto> {
  const notification = await repository.findNotificationById(id);
  if (!notification) throw new NotFoundError("Notification introuvable.");
  assertUserOwnership(actor, notification.userId);
  return toNotificationDto(await repository.markAsRead(id));
}

export async function markAllRead(actor: Actor): Promise<{ updated: number }> {
  const result = await repository.markAllAsRead(actor.id);
  return { updated: result.count };
}

export async function remove(actor: Actor, id: string): Promise<void> {
  const notification = await repository.findNotificationById(id);
  if (!notification) throw new NotFoundError("Notification introuvable.");
  assertUserOwnership(actor, notification.userId);
  await repository.deleteNotification(id);
}
