/**
 * URLs de médias.
 *
 * Volontairement SANS `"use client"` : ces fonctions sont pures et servent aussi
 * bien aux Server Components (page d'accueil publique) qu'aux composants
 * clients. Les mettre dans `media.ts` — qui est un module client à cause de ses
 * hooks — forcerait la carte de formation à basculer côté navigateur alors
 * qu'elle n'en a aucun besoin.
 */
import { API_URL } from "@/lib/config";

/** Origine de l'API, sans le préfixe de version. */
function apiOrigin(): string {
  // `API_URL` se termine par le préfixe (« …/api/v1 »), que les URLs renvoyées
  // par l'API contiennent déjà.
  return API_URL.replace(/\/api\/v\d+$/, "");
}

/** Rend absolue une URL relative renvoyée par l'API. */
export function absoluteApiUrl(src: string): string {
  return `${apiOrigin()}${src}`;
}

/**
 * Source utilisable dans un `<img>` pour un média PUBLIC.
 *
 * Les couvertures de formation sont servies sans authentification : nul besoin
 * de passer par un `blob:` comme pour les documents protégés, il suffit de
 * rendre l'URL absolue — l'API vit sur une autre origine que le frontend.
 *
 * Une URL externe (`http…`), une data URL ou un `blob:` sont renvoyés tels quels.
 */
export function mediaUrl(src?: string | null): string | undefined {
  if (!src) return undefined;
  if (src.startsWith("http") || src.startsWith("data:") || src.startsWith("blob:")) return src;
  return absoluteApiUrl(src);
}
