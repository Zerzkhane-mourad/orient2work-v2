import type { DocumentType, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export function createDocument(data: Prisma.DocumentUncheckedCreateInput) {
  return prisma.document.create({ data });
}

export function findDocumentById(id: string) {
  return prisma.document.findUnique({ where: { id } });
}

export function listDocuments(
  ownerId: string,
  types: DocumentType[] | undefined,
  skip: number,
  take: number,
) {
  const where: Prisma.DocumentWhereInput = {
    ownerId,
    ...(types?.length ? { type: { in: types } } : {}),
  };
  return Promise.all([
    prisma.document.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
    prisma.document.count({ where }),
  ]);
}

export function deleteDocument(id: string) {
  return prisma.document.delete({ where: { id } });
}

/** Le CV attaché à une candidature ne doit pas pouvoir être supprimé sous les pieds du recruteur. */
export function countCandidaturesUsingDocument(documentId: string) {
  return prisma.candidature.count({ where: { cvId: documentId } });
}
