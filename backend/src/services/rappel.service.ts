/**
 * Rappels d'entretien, une heure avant.
 *
 * Le planificateur balaie périodiquement les entretiens CONFIRMÉS et prévient
 * les deux parties, par notification dans l'application et par email.
 *
 * Deux propriétés comptent plus que le reste :
 *  • **exactement une fois** — la colonne `rappelEnvoyeAt` sert de verrou, posé
 *    par un `updateMany` conditionnel. Deux passages simultanés, ou deux
 *    instances de l'API, ne peuvent pas envoyer le même rappel deux fois ;
 *  • **jamais en retard** — un entretien déjà commencé n'est plus rappelé.
 */
import { EntretienStatus } from "@prisma/client";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { doitEnvoyerRappel, fenetreDeBalayage, instantEntretien } from "../domain/rappels.js";
import { sendEntretienRappelEmail } from "../lib/mailer.js";
import { prisma } from "../lib/prisma.js";
import { notify } from "./notification.service.js";

/** Date lisible dans le fuseau de l'application — « lundi 19 août à 14:00 ». */
function quandLisible(debut: Date): string {
  const jour = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: env.APP_TIMEZONE,
  }).format(debut);
  const heure = new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: env.APP_TIMEZONE,
  }).format(debut);
  return `${jour} à ${heure}`;
}

/**
 * Réserve l'envoi pour cet entretien.
 *
 * `updateMany` filtré sur `rappelEnvoyeAt: null` : la base tranche. Si zéro
 * ligne est touchée, quelqu'un d'autre a déjà pris le rappel en charge.
 */
async function reserverEnvoi(id: string): Promise<boolean> {
  const { count } = await prisma.entretien.updateMany({
    where: { id, rappelEnvoyeAt: null },
    data: { rappelEnvoyeAt: new Date() },
  });
  return count === 1;
}

/**
 * Envoie les rappels dus.
 *
 * @returns nombre d'entretiens rappelés — utile aux journaux et aux tests.
 */
export async function envoyerRappelsDus(maintenant = new Date()): Promise<number> {
  const { debut, fin } = fenetreDeBalayage(maintenant);
  const toleranceMs = env.RAPPEL_INTERVALLE_MIN * 60 * 1000;

  const candidats = await prisma.entretien.findMany({
    where: {
      // Seuls les entretiens CONFIRMÉS : rappeler une demande en attente
      // laisserait croire qu'elle est acceptée.
      status: EntretienStatus.accepte,
      rappelEnvoyeAt: null,
      date: { gte: debut, lte: fin },
    },
    include: {
      jeune: { select: { prenom: true, nom: true, user: { select: { id: true, email: true } } } },
      entreprise: { select: { nom: true, user: { select: { id: true, email: true } } } },
    },
  });

  let envoyes = 0;

  for (const entretien of candidats) {
    const debutReel = instantEntretien(entretien.date, entretien.heure, env.APP_TIMEZONE);
    if (!debutReel) {
      logger.warn(
        { entretienId: entretien.id, date: entretien.date, heure: entretien.heure },
        "Entretien à l'horaire illisible : rappel ignoré",
      );
      continue;
    }
    if (!doitEnvoyerRappel(debutReel, maintenant, toleranceMs)) continue;

    // Verrou AVANT tout envoi : mieux vaut un rappel manqué qu'un doublon.
    if (!(await reserverEnvoi(entretien.id))) continue;

    const quand = quandLisible(debutReel);
    const candidat = `${entretien.jeune.prenom} ${entretien.jeune.nom}`;
    const lien = entretien.lienReunion ?? undefined;

    /*
     * Les deux parties sont prévenues, chacune avec SON interlocuteur et le
     * chemin de son propre espace. Les échecs d'email sont absorbés par le
     * mailer ; ceux des notifications par `notify`. Un rappel partiellement
     * délivré vaut mieux qu'une boucle interrompue au premier destinataire.
     */
    await notify({
      userId: entretien.jeune.user.id,
      icon: "event_available",
      title: `Entretien dans 1 heure — ${entretien.entreprise.nom}`,
      detail: `${entretien.offreTitre} · ${quand}`,
      href: "/espace-jeune/entretiens",
      accent: true,
    });
    await sendEntretienRappelEmail(entretien.jeune.user.email, {
      interlocuteur: entretien.entreprise.nom,
      objet: entretien.offreTitre,
      quand,
      ...(lien ? { lienReunion: lien } : {}),
      chemin: "/espace-jeune/entretiens",
    });

    await notify({
      userId: entretien.entreprise.user.id,
      icon: "event_available",
      title: `Entretien dans 1 heure — ${candidat}`,
      detail: `${entretien.offreTitre} · ${quand}`,
      href: "/espace-entreprise/entretiens",
      accent: true,
    });
    await sendEntretienRappelEmail(entretien.entreprise.user.email, {
      interlocuteur: candidat,
      objet: entretien.offreTitre,
      quand,
      ...(lien ? { lienReunion: lien } : {}),
      chemin: "/espace-entreprise/entretiens",
    });

    envoyes++;
  }

  if (envoyes > 0) logger.info({ envoyes }, "Rappels d'entretien envoyés");
  return envoyes;
}

/**
 * Démarre le balayage périodique.
 *
 * `unref()` : ce minuteur ne doit pas retenir le processus au moment de
 * l'arrêt. Un échec de passage est journalisé sans interrompre la boucle — le
 * passage suivant reprendra les entretiens encore dus.
 *
 * @returns de quoi arrêter le planificateur (tests, arrêt gracieux).
 */
export function demarrerPlanificateurRappels(): () => void {
  const intervalleMs = env.RAPPEL_INTERVALLE_MIN * 60 * 1000;

  const timer = setInterval(() => {
    void envoyerRappelsDus().catch((error: unknown) => {
      logger.error({ err: error }, "Échec d'un passage de rappels");
    });
  }, intervalleMs);
  timer.unref();

  logger.info(
    { intervalleMin: env.RAPPEL_INTERVALLE_MIN, fuseau: env.APP_TIMEZONE },
    "Planificateur de rappels démarré",
  );
  return () => clearInterval(timer);
}
