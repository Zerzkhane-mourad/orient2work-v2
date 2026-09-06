import { z } from "zod";
import { paginationSchema } from "../lib/pagination.js";
import { emailSchema, longText, shortText } from "./common.validator.js";

/** Formulaire de contact public (§ page Contact). */
export const contactMessageSchema = z
  .object({
    nom: shortText(120),
    email: emailSchema,
    sujet: shortText(200),
    message: longText(5000, 10),
  })
  .strict();

export const listContactMessagesSchema = paginationSchema
  .extend({
    traite: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .optional(),
  })
  .strict();

export const updateContactMessageSchema = z.object({ traite: z.boolean() }).strict();

export const subscribeNewsletterSchema = z.object({ email: emailSchema }).strict();

export const unsubscribeNewsletterSchema = z
  .object({ token: z.string().min(20).max(200) })
  .strict();

export type ContactMessageInput = z.infer<typeof contactMessageSchema>;
export type ListContactMessagesInput = z.infer<typeof listContactMessagesSchema>;
