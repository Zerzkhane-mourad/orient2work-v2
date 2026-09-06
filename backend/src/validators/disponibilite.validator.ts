import { z } from "zod";
import { longText, searchSchema } from "./common.validator.js";
import { paginationSchema } from "../lib/pagination.js";

/** `HH:MM` sur 24 heures. Le format est le même en base et à l'écran. */
const heureSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "heure attendue au format HH:MM");

/**
 * Réglages de la prise de rendez-vous spontanée.
 *
 * Les bornes ne sont pas décoratives : un créneau de 5 minutes ou un horizon
 * d'un an produiraient des milliers de créneaux à calculer et à afficher.
 */
export const updateDisponibilitesSchema = z
  .object({
    spontaneeOuverte: z.boolean().optional(),
    /** Multiples de 15 minutes : les autres valeurs ne tombent pas juste. */
    creneauDureeMin: z.coerce
      .number()
      .int()
      .min(15)
      .max(120)
      .refine((valeur) => valeur % 15 === 0, "durée par pas de 15 minutes")
      .optional(),
    reservationSemaines: z.coerce.number().int().min(1).max(12).optional(),
    spontaneeMessage: longText(500).optional(),
    /**
     * Journées ouvertes à la réservation.
     *
     * La liste envoyée REMPLACE l'existant À PARTIR D'AUJOURD'HUI ; les dates
     * passées ne sont pas transmises et restent intactes. Une journée est
     * ouverte parce qu'elle figure ici — pour la fermer, on ne l'envoie plus.
     * D'où `min(1)` sur les plages : une journée sans horaire n'ouvre rien et
     * n'aurait fait qu'encombrer le calendrier d'une case morte.
     */
    dates: z
      .array(
        z
          .object({
            date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date attendue au format AAAA-MM-JJ"),
            plages: z
              .array(z.object({ debut: heureSchema, fin: heureSchema }).strict())
              .min(1, "au moins une plage horaire")
              .max(6),
          })
          .strict(),
      )
      .max(90)
      .refine(
        (dates) => new Set(dates.map((d) => d.date)).size === dates.length,
        "une même date ne peut apparaître qu'une fois",
      )
      .optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, "aucun champ à mettre à jour");

/** Réservation d'un créneau par un jeune. */
export const reserverCreneauSchema = z
  .object({
    /** `YYYY-MM-DD` — jour local, tel que renvoyé par le calendrier. */
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date attendue au format AAAA-MM-JJ"),
    heure: heureSchema,
    message: longText(1000).optional(),
  })
  .strict();

export type UpdateDisponibilitesInput = z.infer<typeof updateDisponibilitesSchema>;
export type ReserverCreneauInput = z.infer<typeof reserverCreneauSchema>;

/**
 * Liste des entreprises ouvertes, avec recherche.
 *
 * `q` permet à la recherche globale d'ouvrir cet écran déjà filtré : sans lui,
 * un lien « voir les 3 autres entreprises » retomberait sur la liste entière.
 */
export const listEntreprisesOuvertesSchema = paginationSchema
  .extend({ q: searchSchema })
  .strict();

export type ListEntreprisesOuvertesInput = z.infer<typeof listEntreprisesOuvertesSchema>;
