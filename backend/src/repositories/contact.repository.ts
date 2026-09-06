import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export function createContactMessage(data: Prisma.ContactMessageUncheckedCreateInput) {
  return prisma.contactMessage.create({ data });
}

export function listContactMessages(traite: boolean | undefined, skip: number, take: number) {
  const where: Prisma.ContactMessageWhereInput = traite === undefined ? {} : { traite };
  return Promise.all([
    prisma.contactMessage.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
    prisma.contactMessage.count({ where }),
  ]);
}

export function findContactMessage(id: string) {
  return prisma.contactMessage.findUnique({ where: { id } });
}

export function setContactMessageTraite(id: string, traite: boolean) {
  return prisma.contactMessage.update({
    where: { id },
    data: { traite, traiteAt: traite ? new Date() : null },
  });
}

export function countUnhandledContactMessages() {
  return prisma.contactMessage.count({ where: { traite: false } });
}

// ── Newsletter ───────────────────────────────────────────────────────────────

export function findSubscriptionByEmail(email: string) {
  return prisma.newsletterSubscription.findUnique({ where: { email } });
}

export function findSubscriptionByToken(unsubscribeTokenHash: string) {
  return prisma.newsletterSubscription.findUnique({ where: { unsubscribeTokenHash } });
}

export function createSubscription(data: { email: string; unsubscribeTokenHash: string }) {
  return prisma.newsletterSubscription.create({ data });
}

export function reactivateSubscription(id: string, unsubscribeTokenHash: string) {
  return prisma.newsletterSubscription.update({
    where: { id },
    data: { active: true, unsubscribedAt: null, unsubscribeTokenHash },
  });
}

export function deactivateSubscription(id: string) {
  return prisma.newsletterSubscription.update({
    where: { id },
    data: { active: false, unsubscribedAt: new Date() },
  });
}

export function listSubscriptions(skip: number, take: number) {
  return Promise.all([
    prisma.newsletterSubscription.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.newsletterSubscription.count({ where: { active: true } }),
  ]);
}
