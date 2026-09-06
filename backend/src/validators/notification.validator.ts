import { z } from "zod";
import { DocumentType } from "@prisma/client";
import { paginationSchema } from "../lib/pagination.js";
import { enumList } from "./common.validator.js";

export const listNotificationsSchema = paginationSchema
  .extend({
    unreadOnly: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .optional(),
  })
  .strict();

export const uploadDocumentSchema = z.object({ type: z.nativeEnum(DocumentType) }).strict();

export const listDocumentsSchema = paginationSchema
  .extend({
    /**
     * Un type, ou plusieurs séparés par des virgules : l'écran « Mes documents »
     * ne montre que les pièces de candidature (`CV,AUTRE`), la photo et la
     * bannière se gèrent depuis le profil.
     */
    type: enumList(DocumentType).optional(),
  })
  .strict();

export type ListNotificationsInput = z.infer<typeof listNotificationsSchema>;
export type ListDocumentsInput = z.infer<typeof listDocumentsSchema>;
