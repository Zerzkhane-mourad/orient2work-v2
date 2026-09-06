/**
 * Candidature spontanée et disponibilités (§10).
 *
 * L'entreprise programme des JOURNÉES précises avec leurs horaires ; les
 * créneaux réservables en sont déduits (`domain/disponibilites.ts`). Le jeune en
 * choisit un, ce qui crée un `Entretien` marqué `spontanee` — le modèle accepte
 * déjà une demande sans offre ni candidature, et l'on hérite ainsi de tout son
 * cycle de vie : acceptation, refus, lien de réunion, notifications.
 */
import { JeuneStatus, Role } from "@prisma/client";
import {
  chevauchement,
  creneauxOuverts,
  dateIsoUtc,
  problemePlage,
  type DateDisponible,
  type JourneeCreneaux,
} from "../domain/disponibilites.js";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "../lib/errors.js";
import { buildMeta, toSkipTake } from "../lib/pagination.js";
import { stripTags } from "../lib/sanitize.js";
import type { Actor } from "../middlewares/authorize.js";
import * as repository from "../repositories/disponibilite.repository.js";
import * as rechercheRepository from "../repositories/recherche.repository.js";
import * as entrepriseRepository from "../repositories/entreprise.repository.js";
import * as jeuneRepository from "../repositories/jeune.repository.js";
import * as entretienRepository from "../repositories/entretien.repository.js";
import { notify } from "./notification.service.js";
import type { ApiMeta } from "../lib/http.js";
import type {
  ListEntreprisesOuvertesInput,
  ReserverCreneauInput,
  UpdateDisponibilitesInput,
} from "../validators/disponibilite.validator.js";

/** Libellé figé sur l'entretien : il n'y a pas d'offre à nommer. */
const TITRE_SPONTANEE = "Candidature spontanée";

export interface ReglagesDto {
  spontaneeOuverte: boolean;
  creneauDureeMin: number;
  reservationSemaines: number;
  spontaneeMessage: string;
  /** Journées programmées à venir, ordonnées. */
  dates: DateDisponible[];
}

/** Minuit UTC du jour — borne des journées programmées encore utiles. */
function debutDuJour(): Date {
  const jour = new Date();
  jour.setUTCHours(0, 0, 0, 0);
  return jour;
}

/**
 * Regroupe les lignes de la base en une journée par date.
 *
 * En base, une ligne = une plage. À l'usage, ce qui compte est « cette date,
 * ces plages » : c'est la forme que manipulent le domaine comme l'écran.
 */
function versDates(lignes: Array<{ date: Date; debut: string; fin: string }>): DateDisponible[] {
  const parDate = new Map<string, DateDisponible>();

  for (const ligne of lignes) {
    const date = dateIsoUtc(ligne.date);
    const journee = parDate.get(date) ?? { date, plages: [] };
    journee.plages.push({ debut: ligne.debut, fin: ligne.fin });
    parDate.set(date, journee);
  }

  return [...parDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export interface EntrepriseOuverteDto {
  id: string;
  nom: string;
  logo?: string;
  secteur: string;
  ville: string;
  spontaneeMessage: string;
  creneauDureeMin: number;
  /** Nombre de journées encore ouvertes — de quoi jauger la fiche sans l'ouvrir. */
  journeesOuvertes: number;
  /** Première journée ouverte, `YYYY-MM-DD` ; `null` s'il n'en reste aucune. */
  prochaineDate: string | null;
}

/** Résumé d'ouverture affiché sur la fiche, sans recalculer les créneaux. */
function resumeOuverture(lignes: Array<{ date: Date }>): {
  journeesOuvertes: number;
  prochaineDate: string | null;
} {
  // Une ligne par PLAGE : sans dédoublonnage, une journée coupée par le
  // déjeuner compterait pour deux.
  const dates = [...new Set(lignes.map((ligne) => dateIsoUtc(ligne.date)))].sort();
  return { journeesOuvertes: dates.length, prochaineDate: dates[0] ?? null };
}

/* ── Côté entreprise ──────────────────────────────────────────────────── */

function assertEntreprise(actor: Actor): string {
  if (actor.role !== Role.ENTREPRISE || !actor.profileId) {
    throw new ForbiddenError("Réservé aux comptes entreprise.");
  }
  return actor.profileId;
}

export async function getReglages(actor: Actor): Promise<ReglagesDto> {
  const entrepriseId = assertEntreprise(actor);
  const entreprise = await entrepriseRepository.findEntrepriseById(entrepriseId);
  if (!entreprise) throw new NotFoundError("Profil entreprise introuvable.");

  const dates = await repository.listDates(entrepriseId, debutDuJour());

  return {
    spontaneeOuverte: entreprise.spontaneeOuverte,
    creneauDureeMin: entreprise.creneauDureeMin,
    reservationSemaines: entreprise.reservationSemaines,
    spontaneeMessage: entreprise.spontaneeMessage,
    dates: versDates(dates),
  };
}

export async function updateReglages(
  actor: Actor,
  input: UpdateDisponibilitesInput,
): Promise<ReglagesDto> {
  const entrepriseId = assertEntreprise(actor);
  const entreprise = await entrepriseRepository.findEntrepriseById(entrepriseId);
  if (!entreprise) throw new NotFoundError("Profil entreprise introuvable.");

  const duree = input.creneauDureeMin ?? entreprise.creneauDureeMin;

  if (input.dates) {
    for (const jour of input.dates) {
      /*
       * Les plages sont validées CONTRE la durée retenue : « 9h00–9h20 » est
       * acceptable pour des créneaux de 15 minutes et absurde pour 30. Le
       * contrôle ne peut donc pas vivre dans le schéma zod, qui ignore la durée.
       */
      for (const plage of jour.plages) {
        const probleme = problemePlage(plage, duree);
        if (probleme) {
          throw new ValidationError("Plage horaire invalide.", [
            { field: `dates.${jour.date}`, message: probleme },
          ]);
        }
      }

      /*
       * Deux plages superposées le même jour ne cassent rien — les créneaux sont
       * dédoublonnés — mais elles ne sont jamais voulues. Les refuser à
       * l'enregistrement évite un calendrier que personne ne relira.
       */
      const conflit = chevauchement(jour.plages);
      if (conflit) {
        const [a, b] = conflit;
        throw new ValidationError("Plages horaires qui se chevauchent.", [
          {
            field: `dates.${jour.date}`,
            message: `« ${a.debut}-${a.fin} » et « ${b.debut}-${b.fin} » se chevauchent.`,
          },
        ]);
      }
    }
  }

  await entrepriseRepository.updateEntreprise(entrepriseId, {
    ...(input.spontaneeOuverte !== undefined ? { spontaneeOuverte: input.spontaneeOuverte } : {}),
    ...(input.creneauDureeMin !== undefined ? { creneauDureeMin: input.creneauDureeMin } : {}),
    ...(input.reservationSemaines !== undefined
      ? { reservationSemaines: input.reservationSemaines }
      : {}),
    ...(input.spontaneeMessage !== undefined
      ? { spontaneeMessage: stripTags(input.spontaneeMessage) }
      : {}),
  });

  if (input.dates) {
    // Une ligne par plage. MINUIT UTC, comme partout ailleurs sur `@db.Date` :
    // un minuit LOCAL serait tronqué à la veille dans tout fuseau positif.
    const lignes = input.dates.flatMap((jour) =>
      jour.plages.map((plage) => ({
        date: new Date(`${jour.date}T00:00:00.000Z`),
        debut: plage.debut,
        fin: plage.fin,
      })),
    );

    await repository.replaceDates(entrepriseId, debutDuJour(), lignes);
  }

  return getReglages(actor);
}

/* ── Côté jeune ───────────────────────────────────────────────────────── */

/** Le parcours impose la validation du test avant tout contact (§5.5). */
async function assertJeuneValide(actor: Actor): Promise<string> {
  if (actor.role !== Role.JEUNE || !actor.profileId) {
    throw new ForbiddenError("Réservé aux comptes jeunes.");
  }
  const jeune = await jeuneRepository.findJeuneById(actor.profileId);
  if (!jeune) throw new NotFoundError("Profil introuvable.");
  if (jeune.status !== JeuneStatus.valide) {
    throw new ForbiddenError(
      "Votre profil doit être validé (test réussi) avant de contacter une entreprise.",
    );
  }
  return jeune.id;
}

export async function listEntreprisesOuvertes(
  input: ListEntreprisesOuvertesInput,
): Promise<{ items: EntrepriseOuverteDto[]; meta: ApiMeta }> {
  const { skip, take } = toSkipTake(input);

  /*
   * L'appariement du texte passe par le dépôt de recherche, seul à ignorer les
   * accents — « developpeur » doit rencontrer « Développeur ». Le dépôt des
   * disponibilités n'ajoute ensuite que la règle de visibilité.
   */
  const ids = input.q
    ? await rechercheRepository.idsEntreprisesCorrespondantes(input.q)
    : undefined;

  // Aucune correspondance : inutile d'interroger la base pour rien.
  if (ids?.length === 0) {
    return { items: [], meta: buildMeta(input, 0) };
  }

  const [rows, total] = await repository.listEntreprisesOuvertes(skip, take, ids);

  return {
    items: rows.map((entreprise) => ({
      id: entreprise.id,
      nom: entreprise.nom,
      ...(entreprise.logo ? { logo: entreprise.logo } : {}),
      secteur: entreprise.secteur,
      ville: entreprise.ville,
      spontaneeMessage: entreprise.spontaneeMessage,
      creneauDureeMin: entreprise.creneauDureeMin,
      ...resumeOuverture(entreprise.disponibilites),
    })),
    meta: buildMeta(input, total),
  };
}

export interface CalendrierDto {
  entreprise: EntrepriseOuverteDto;
  journees: JourneeCreneaux[];
  /** Demande déjà en attente auprès de cette entreprise, s'il y en a une. */
  demandeEnCours: { id: string; date: string; heure: string } | null;
}

export async function getCalendrier(actor: Actor, entrepriseId: string): Promise<CalendrierDto> {
  const jeuneId = await assertJeuneValide(actor);

  const entreprise = await repository.findEntrepriseOuverte(entrepriseId);
  if (!entreprise) {
    throw new NotFoundError("Cette entreprise ne reçoit pas de candidature spontanée.");
  }

  const maintenant = new Date();
  const horizon = new Date(maintenant);
  horizon.setDate(horizon.getDate() + entreprise.reservationSemaines * 7);

  const occupes = await repository.listCreneauxOccupes(entrepriseId, horizon);

  const journees = creneauxOuverts({
    dates: versDates(entreprise.disponibilites),
    dureeMin: entreprise.creneauDureeMin,
    semaines: entreprise.reservationSemaines,
    reserves: occupes.map((entretien) => ({
      date: dateIsoUtc(entretien.date),
      heure: entretien.heure,
    })),
    maintenant,
  });

  const enCours = await repository.findDemandeSpontaneeEnCours(entrepriseId, jeuneId);

  return {
    entreprise: {
      id: entreprise.id,
      nom: entreprise.nom,
      ...(entreprise.logo ? { logo: entreprise.logo } : {}),
      secteur: entreprise.secteur,
      ville: entreprise.ville,
      spontaneeMessage: entreprise.spontaneeMessage,
      creneauDureeMin: entreprise.creneauDureeMin,
      ...resumeOuverture(entreprise.disponibilites),
    },
    journees,
    demandeEnCours: enCours
      ? { id: enCours.id, date: dateIsoUtc(enCours.date), heure: enCours.heure }
      : null,
  };
}

/**
 * Réserve un créneau : crée la demande d'entretien spontanée.
 *
 * Le créneau demandé est REVÉRIFIÉ contre le calendrier recalculé. Entre
 * l'affichage et le clic, l'entreprise a pu retirer sa journée ou un autre
 * candidat prendre la place — s'en remettre à ce que le navigateur envoie
 * laisserait réserver n'importe quelle heure.
 */
export async function reserverCreneau(
  actor: Actor,
  entrepriseId: string,
  input: ReserverCreneauInput,
): Promise<{ id: string; date: string; heure: string }> {
  const jeuneId = await assertJeuneValide(actor);

  const calendrier = await getCalendrier(actor, entrepriseId);

  // Une seule demande en attente à la fois : sans cela, un candidat pourrait
  // bloquer plusieurs créneaux de la même entreprise.
  if (calendrier.demandeEnCours) {
    throw new ConflictError("Vous avez déjà une demande en attente auprès de cette entreprise.");
  }

  const journee = calendrier.journees.find((j) => j.date === input.date);
  if (!journee?.creneaux.includes(input.heure)) {
    throw new ConflictError("Ce créneau n'est plus disponible. Choisissez-en un autre.");
  }

  const jeune = await jeuneRepository.findJeuneById(jeuneId);
  const entreprise = await entrepriseRepository.findEntrepriseById(entrepriseId);

  const entretien = await entretienRepository.createEntretien({
    jeuneId,
    entrepriseId,
    offreTitre: TITRE_SPONTANEE,
    /*
     * MINUIT UTC, comme `dateOnlySchema` partout ailleurs. Un minuit LOCAL
     * serait tronqué au jour précédent par la colonne `@db.Date` dans tout
     * fuseau positif : le créneau serait réservé la veille.
     */
    date: new Date(`${input.date}T00:00:00.000Z`),
    heure: input.heure,
    spontanee: true,
    ...(input.message ? { commentaire: stripTags(input.message) } : {}),
  });

  if (entreprise && jeune) {
    await notify({
      userId: entreprise.userId,
      icon: "person_add",
      title: "Candidature spontanée",
      detail: `${jeune.prenom} ${jeune.nom} a réservé le ${input.date} à ${input.heure}.`,
      href: "/espace-entreprise/entretiens",
      accent: true,
    });
  }

  return { id: entretien.id, date: input.date, heure: input.heure };
}
