/** Pagination normalisée : bornée pour qu'un client ne puisse pas demander 100 000 lignes. */
import { z } from "zod";
import type { ApiMeta } from "./http.js";

export const MAX_PER_PAGE = 100;

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(MAX_PER_PAGE).default(20),
});

export type Pagination = z.infer<typeof paginationSchema>;

export function toSkipTake(pagination: Pagination): { skip: number; take: number } {
  return { skip: (pagination.page - 1) * pagination.perPage, take: pagination.perPage };
}

export function buildMeta(pagination: Pagination, total: number): ApiMeta {
  return {
    page: pagination.page,
    perPage: pagination.perPage,
    total,
    totalPages: Math.max(1, Math.ceil(total / pagination.perPage)),
  };
}
