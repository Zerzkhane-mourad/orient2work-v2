/**
 * Hachage des mots de passe (bcrypt).
 *
 * Point d'entrée unique : passer à argon2 ne demande de modifier que ce fichier.
 * Un mot de passe en clair ne quitte jamais ce module, et n'est jamais persisté
 * ni renvoyé au client.
 */
import bcrypt from "bcryptjs";
import { env } from "../config/env.js";

/** Coût constant utilisé pour neutraliser l'attaque temporelle sur l'existence d'un compte. */
const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEe.9m2rl4Vw0Yv7z1p6nJm0Q1F6uJ5jvGe";

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, env.BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * À appeler quand l'email n'existe pas, pour que la réponse mette le même temps
 * que pour un compte réel : sans cela, la latence révèle quels emails sont inscrits.
 */
export async function burnPasswordComparison(plain: string): Promise<void> {
  await bcrypt.compare(plain, DUMMY_HASH);
}
