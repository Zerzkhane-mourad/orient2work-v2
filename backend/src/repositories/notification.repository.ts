import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export function listNotifications(userId: string, unreadOnly: boolean, skip: number, take: number) {
  const where: Prisma.NotificationWhereInput = { userId, ...(unreadOnly ? { read: false } : {}) };
  return Promise.all([
    prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
    prisma.notification.count({ where }),
  ]);
}

export function countUnread(userId: string) {
  return prisma.notification.count({ where: { userId, read: false } });
}

export function findNotificationById(id: string) {
  return prisma.notification.findUnique({ where: { id } });
}

export function markAsRead(id: string) {
  return prisma.notification.update({ where: { id }, data: { read: true } });
}

export function markAllAsRead(userId: string) {
  return prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
}

export function deleteNotification(id: string) {
  return prisma.notification.delete({ where: { id } });
}

export function createNotification(data: Prisma.NotificationUncheckedCreateInput) {
  return prisma.notification.create({ data });
}

export function createManyNotifications(data: Prisma.NotificationUncheckedCreateInput[]) {
  return prisma.notification.createMany({ data });
}
