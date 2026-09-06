/**
 * Envoi d'emails transactionnels (vérification d'inscription, reset).
 *
 * Sans `SMTP_HOST` configuré, les emails sont écrits dans les logs en niveau
 * `info` — pratique en développement, et sans risque : seul le lien est tracé,
 * jamais un mot de passe.
 */
import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!env.SMTP_HOST) return null;
  transporter ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
  });
  return transporter;
}

interface MailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

async function sendMail(options: MailOptions): Promise<void> {
  const transport = getTransporter();
  if (!transport) {
    logger.info(
      { to: options.to, subject: options.subject, preview: options.text },
      "Email simulé",
    );
    return;
  }
  try {
    await transport.sendMail({ from: env.MAIL_FROM, ...options });
  } catch (error) {
    // Un email qui ne part pas ne doit pas faire échouer l'inscription :
    // l'utilisateur peut demander un renvoi.
    logger.error({ err: error, to: options.to }, "Échec d'envoi d'email");
  }
}

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const url = `${env.APP_URL}/verification-email?token=${encodeURIComponent(token)}`;
  await sendMail({
    to,
    subject: "Orient2Work — confirmez votre adresse email",
    text: `Bienvenue sur Orient2Work.\n\nConfirmez votre adresse en ouvrant ce lien (valable ${env.EMAIL_TOKEN_TTL_MINUTES} minutes) :\n${url}\n\nSi vous n'êtes pas à l'origine de cette inscription, ignorez ce message.`,
    html: `<p>Bienvenue sur <strong>Orient2Work</strong>.</p><p>Confirmez votre adresse en cliquant sur <a href="${url}">ce lien</a> (valable ${env.EMAIL_TOKEN_TTL_MINUTES} minutes).</p><p>Si vous n'êtes pas à l'origine de cette inscription, ignorez ce message.</p>`,
  });
}

/**
 * Confirmation d'inscription à la newsletter.
 *
 * Le lien de désinscription est inclus dès le premier envoi : c'est le seul
 * moyen pour l'abonné de se retirer, et cela évite d'exposer une route de
 * désinscription par simple adresse email.
 */
export async function sendNewsletterWelcomeEmail(to: string, token: string): Promise<void> {
  const url = `${env.APP_URL}/desinscription-newsletter?token=${encodeURIComponent(token)}`;
  await sendMail({
    to,
    subject: "Orient2Work — votre inscription à la newsletter",
    text: `Merci pour votre inscription à la newsletter Orient2Work.\n\nVous recevrez nos actualités, nouvelles formations et opportunités.\n\nPour vous désinscrire à tout moment :\n${url}`,
    html: `<p>Merci pour votre inscription à la newsletter <strong>Orient2Work</strong>.</p><p>Vous recevrez nos actualités, nouvelles formations et opportunités.</p><p><a href="${url}">Se désinscrire</a> à tout moment.</p>`,
  });
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const url = `${env.APP_URL}/reinitialisation-mot-de-passe?token=${encodeURIComponent(token)}`;
  await sendMail({
    to,
    subject: "Orient2Work — réinitialisation de votre mot de passe",
    text: `Vous avez demandé la réinitialisation de votre mot de passe.\n\nOuvrez ce lien (valable ${env.PASSWORD_RESET_TTL_MINUTES} minutes) :\n${url}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message : votre mot de passe reste inchangé.`,
    html: `<p>Vous avez demandé la réinitialisation de votre mot de passe.</p><p><a href="${url}">Choisir un nouveau mot de passe</a> (lien valable ${env.PASSWORD_RESET_TTL_MINUTES} minutes).</p><p>Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.</p>`,
  });
}

export interface RappelEntretien {
  /** Ce que le destinataire doit retenir en objet : avec qui. */
  interlocuteur: string;
  objet: string;
  /** Date lisible, déjà formatée dans le fuseau de l'application. */
  quand: string;
  lienReunion?: string;
  /** Chemin relatif vers l'écran des entretiens du destinataire. */
  chemin: string;
}

/**
 * Rappel envoyé une heure avant un entretien.
 *
 * Le lien de visio n'est inclus QUE s'il existe : promettre un bouton
 * « rejoindre » absent du message serait pire que de ne rien annoncer.
 */
export async function sendEntretienRappelEmail(
  to: string,
  rappel: RappelEntretien,
): Promise<void> {
  const url = `${env.APP_URL}${rappel.chemin}`;
  const visioTexte = rappel.lienReunion ? `\n\nLien de la réunion :\n${rappel.lienReunion}` : "";
  const visioHtml = rappel.lienReunion
    ? `<p><a href="${rappel.lienReunion}">Rejoindre la réunion</a></p>`
    : "";

  await sendMail({
    to,
    subject: `Rappel — entretien dans 1 heure avec ${rappel.interlocuteur}`,
    text: `Votre entretien commence dans une heure.\n\n${rappel.objet}\nAvec : ${rappel.interlocuteur}\nQuand : ${rappel.quand}${visioTexte}\n\nDétails :\n${url}`,
    html: `<p>Votre entretien commence dans <strong>une heure</strong>.</p><p><strong>${rappel.objet}</strong><br />Avec : ${rappel.interlocuteur}<br />Quand : ${rappel.quand}</p>${visioHtml}<p><a href="${url}">Voir les détails</a></p>`,
  });
}
