import type { Document, Notification } from "@prisma/client";

export interface NotificationDto {
  id: string;
  icon: string;
  title: string;
  detail?: string;
  href?: string;
  read: boolean;
  accent: boolean;
  createdAt: string;
}

export function toNotificationDto(notification: Notification): NotificationDto {
  return {
    id: notification.id,
    icon: notification.icon,
    title: notification.title,
    ...(notification.detail ? { detail: notification.detail } : {}),
    ...(notification.href ? { href: notification.href } : {}),
    read: notification.read,
    accent: notification.accent,
    createdAt: notification.createdAt.toISOString(),
  };
}

export interface DocumentDto {
  id: string;
  type: string;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: string;
  /** Route protégée : le contrôle d'accès est refait à chaque téléchargement. */
  url: string;
}

/** `storedName` n'est jamais exposé : le chemin disque reste une donnée interne. */
export function toDocumentDto(document: Document, apiPrefix: string): DocumentDto {
  return {
    id: document.id,
    type: document.type,
    filename: document.filename,
    mimeType: document.mimeType,
    size: document.size,
    createdAt: document.createdAt.toISOString(),
    url: `${apiPrefix}/documents/${document.id}/contenu`,
  };
}
