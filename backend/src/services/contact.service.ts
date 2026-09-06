/**
 * Contact et newsletter.
 *
 * Ces deux routes sont PUBLIQUES : n'importe qui peut les appeler. Trois
 * protections en découlent — limitation de débit stricte (voir les routes),
 * assainissement systématique du contenu (il sera réaffiché dans l'espace
 * admin), et réponses constantes qui ne révèlent pas si une adresse est déjà
 * inscrite.
 */
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { NotFoundError } from "../lib/errors.js";
import { buildMeta, toSkipTake, type Pagination } from "../lib/pagination.js";
import { stripTags } from "../lib/sanitize.js";
import { generateOpaqueToken, hashToken } from "../lib/tokens.js";
import { sendNewsletterWelcomeEmail } from "../lib/mailer.js";
import * as repository from "../repositories/contact.repository.js";
import type { ApiMeta } from "../lib/http.js";
import type {
  ContactMessageInput,
  ListContactMessagesInput,
} from "../validators/contact.validator.js";

export interface ContactMessageDto {
  id: string;
  nom: string;
  email: string;
  sujet: string;
  message: string;
  traite: boolean;
  createdAt: string;
}

/** `ip` reste interne : elle sert au diagnostic d'abus, pas à l'affichage. */
function toDto(row: {
  id: string;
  nom: string;
  email: string;
  sujet: string;
  message: string;
  traite: boolean;
  createdAt: Date;
}): ContactMessageDto {
  return {
    id: row.id,
    nom: row.nom,
    email: row.email,
    sujet: row.sujet,
    message: row.message,
    traite: row.traite,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function submitMessage(
  input: ContactMessageInput,
  ip: string | null,
): Promise<{ message: string }> {
  // `stripTags` sur tous les champs libres : le message est réaffiché tel quel
  // dans l'espace admin, un `<script>` y serait exécuté sans cela.
  await repository.createContactMessage({
    nom: stripTags(input.nom),
    email: input.email,
    sujet: stripTags(input.sujet),
    message: stripTags(input.message),
    ip,
  });

  logger.info({ email: input.email }, "Message de contact reçu");
  return { message: "Votre message a bien été envoyé. L'équipe OMB vous répond sous 48h ouvrées." };
}

export async function listMessages(
  input: ListContactMessagesInput,
): Promise<{ items: ContactMessageDto[]; meta: ApiMeta }> {
  const { skip, take } = toSkipTake(input);
  const [rows, total] = await repository.listContactMessages(input.traite, skip, take);
  return { items: rows.map(toDto), meta: buildMeta(input, total) };
}

export async function setTraite(id: string, traite: boolean): Promise<ContactMessageDto> {
  const existing = await repository.findContactMessage(id);
  if (!existing) throw new NotFoundError("Message introuvable.");
  return toDto(await repository.setContactMessageTraite(id, traite));
}

export function countUnhandled(): Promise<number> {
  return repository.countUnhandledContactMessages();
}

// ── Newsletter ───────────────────────────────────────────────────────────────

/**
 * Inscription idempotente.
 *
 * La réponse est identique que l'adresse soit nouvelle, déjà inscrite ou en
 * cours de réinscription : elle ne permet donc pas de tester si une adresse
 * figure dans la liste.
 */
export async function subscribe(email: string): Promise<{ message: string }> {
  const message = "Inscription enregistrée. Vérifiez votre boîte email.";

  const token = generateOpaqueToken();
  const unsubscribeTokenHash = hashToken(token);
  const existing = await repository.findSubscriptionByEmail(email);

  if (existing?.active) {
    // Déjà inscrit : on ne renvoie pas de nouvel email, mais la réponse ne
    // change pas.
    return { message };
  }

  if (existing) {
    await repository.reactivateSubscription(existing.id, unsubscribeTokenHash);
  } else {
    await repository.createSubscription({ email, unsubscribeTokenHash });
  }

  await sendNewsletterWelcomeEmail(email, token);
  return { message };
}

export async function unsubscribe(token: string): Promise<{ message: string }> {
  const subscription = await repository.findSubscriptionByToken(hashToken(token));
  if (!subscription) throw new NotFoundError("Lien de désinscription invalide.");

  if (subscription.active) {
    await repository.deactivateSubscription(subscription.id);
  }
  return { message: "Vous ne recevrez plus notre newsletter." };
}

export async function listSubscriptions(
  pagination: Pagination,
): Promise<{ items: { id: string; email: string; createdAt: string }[]; meta: ApiMeta }> {
  const { skip, take } = toSkipTake(pagination);
  const [rows, total] = await repository.listSubscriptions(skip, take);
  return {
    items: rows.map((row) => ({
      id: row.id,
      email: row.email,
      createdAt: row.createdAt.toISOString(),
    })),
    meta: buildMeta(pagination, total),
  };
}

/** Utilisé par le mailer pour construire le lien de désinscription. */
export function unsubscribeUrl(token: string): string {
  return `${env.APP_URL}/desinscription-newsletter?token=${encodeURIComponent(token)}`;
}
