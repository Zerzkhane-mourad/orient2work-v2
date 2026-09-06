import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

/** Vitrine : uniquement ce qui est publié, dans l'ordre voulu. */
export function listFaqPubliees() {
  return prisma.faq.findMany({
    where: { publiee: true },
    orderBy: [{ ordre: "asc" }, { createdAt: "asc" }],
    select: { id: true, question: true, reponse: true },
  });
}

/** Back-office : tout, masquées comprises. */
export function listFaq() {
  return prisma.faq.findMany({ orderBy: [{ ordre: "asc" }, { createdAt: "asc" }] });
}

export function findFaqById(id: string) {
  return prisma.faq.findUnique({ where: { id } });
}

/**
 * Crée une question en la plaçant EN FIN de liste.
 *
 * Sans ce calcul, toute nouvelle entrée arriverait avec `ordre = 0` et se
 * placerait en tête, devant des questions déjà classées — l'administrateur
 * devrait la redescendre à chaque ajout.
 */
export async function createFaq(data: { question: string; reponse: string; publiee?: boolean }) {
  const dernier = await prisma.faq.aggregate({ _max: { ordre: true } });
  return prisma.faq.create({
    data: { ...data, ordre: (dernier._max.ordre ?? -1) + 1 },
  });
}

export function updateFaq(id: string, data: Prisma.FaqUpdateInput) {
  return prisma.faq.update({ where: { id }, data });
}

export function deleteFaq(id: string) {
  return prisma.faq.delete({ where: { id } });
}

/**
 * Déplace une question d'un cran, et réécrit l'ordre COMPLET.
 *
 * Un simple échange de deux valeurs `ordre` suffirait si elles étaient toujours
 * contiguës — elles ne le sont pas après une suppression. Réécrire toute la
 * liste en une transaction garantit une numérotation dense et sans doublon,
 * quel que soit l'état de départ.
 *
 * @returns `false` si le déplacement sort de la liste ; rien n'est écrit.
 */
export async function moveFaq(id: string, direction: "haut" | "bas"): Promise<boolean> {
  const toutes = await prisma.faq.findMany({
    orderBy: [{ ordre: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });

  const depuis = toutes.findIndex((f) => f.id === id);
  if (depuis === -1) return false;

  const vers = direction === "haut" ? depuis - 1 : depuis + 1;
  if (vers < 0 || vers >= toutes.length) return false;

  const reordonnees = [...toutes];
  const [deplacee] = reordonnees.splice(depuis, 1);
  reordonnees.splice(vers, 0, deplacee!);

  await prisma.$transaction(
    reordonnees.map((f, index) => prisma.faq.update({ where: { id: f.id }, data: { ordre: index } })),
  );
  return true;
}
