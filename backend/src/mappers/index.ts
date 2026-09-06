/**
 * Sérialisation des entités Prisma vers les DTO consommés par le frontend.
 *
 * Cette couche a une responsabilité de sécurité, pas seulement de confort : c'est
 * ici qu'on garantit qu'un `passwordHash`, une bonne réponse de quiz ou l'email
 * d'un candidat ne franchissent jamais la frontière HTTP par inadvertance. Un
 * contrôleur ne renvoie JAMAIS une entité Prisma brute.
 */
export * from "./user.mapper.js";
export * from "./jeune.mapper.js";
export * from "./entreprise.mapper.js";
export * from "./offre.mapper.js";
export * from "./candidature.mapper.js";
export * from "./formation.mapper.js";
export * from "./entretien.mapper.js";
export * from "./notification.mapper.js";
