/**
 * Certificats de formation.
 *
 * Un certificat n'existe que pour une formation VALIDÉE, c'est-à-dire lue en
 * entier puis dont le quiz a été réussi (`FormationProgress.valide`). Il n'est
 * pas stocké : le PDF est régénéré à chaque téléchargement à partir du modèle.
 * Seuls le numéro et la date de réussite sont figés en base, ce qui garantit
 * qu'un même certificat porte toujours la même référence.
 */
import { Role } from "@prisma/client";
import { env } from "../config/env.js";
import {
  formatNumeroCertificat,
  partsDateCertificat,
  referenceCertificat,
} from "../domain/certificat.js";
import { ForbiddenError, NotFoundError } from "../lib/errors.js";
import { renderCertificat } from "../lib/certificat-pdf.js";
import type { Actor } from "../middlewares/authorize.js";
import * as repository from "../repositories/formation.repository.js";
import type { ProgressCertifiee } from "../repositories/formation.repository.js";

export interface CertificatDto {
  formationId: string;
  formation: string;
  /** `O2W-CERT-2026-00042` */
  reference: string;
  delivreLe: string;
  /** Route protégée : le PDF se télécharge avec le jeton du jeune. */
  url: string;
}

export async function list(actor: Actor): Promise<CertificatDto[]> {
  const jeuneId = requireJeuneProfile(actor);
  const progressions = await repository.listProgressValidees(jeuneId);
  return Promise.all(progressions.map(async (p) => toDto(p, await numeroDe(p))));
}

export async function download(
  actor: Actor,
  formationId: string,
): Promise<{ filename: string; content: Uint8Array }> {
  const jeuneId = requireJeuneProfile(actor);

  const progress = await repository.findProgressValidee(jeuneId, formationId);
  if (!progress) {
    throw new NotFoundError("Validez le test de cette formation pour obtenir votre certificat.");
  }

  const numero = await numeroDe(progress);
  const date = dateParts(delivrance(progress));

  const content = await renderCertificat({
    nomComplet: `${progress.jeune.prenom} ${progress.jeune.nom}`.trim(),
    formation: progress.formation.titre,
    date,
    numero: formatNumero(numero),
  });

  return { filename: `certificat-${slug(progress.formation.titre)}.pdf`, content };
}

async function numeroDe(progress: ProgressCertifiee): Promise<number> {
  return progress.certificatNumero ?? repository.attribuerNumeroCertificat(progress.id);
}

function toDto(progress: ProgressCertifiee, numero: number): CertificatDto {
  const date = delivrance(progress);
  return {
    formationId: progress.formationId,
    formation: progress.formation.titre,
    reference: referenceCertificat(numero, date, env.APP_TIMEZONE),
    delivreLe: date.toISOString(),
    url: `${env.API_PREFIX}/formations/${progress.formationId}/certificat`,
  };
}

/** Date de réussite du quiz ; `updatedAt` pour d'éventuelles lignes anciennes. */
function delivrance(progress: ProgressCertifiee): Date {
  return progress.valideAt ?? progress.updatedAt;
}

const formatNumero = formatNumeroCertificat;

/** Jour, mois, année dans le fuseau de l'application, pas celui du serveur. */
function dateParts(date: Date): { jour: string; mois: string; annee: string } {
  return partsDateCertificat(date, env.APP_TIMEZONE);
}

function slug(text: string): string {
  return (
    text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "formation"
  );
}

function requireJeuneProfile(actor: Actor): string {
  if (actor.role !== Role.JEUNE || !actor.profileId) {
    throw new ForbiddenError("Action réservée aux comptes jeunes.");
  }
  return actor.profileId;
}
