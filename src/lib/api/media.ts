"use client";

/**
 * Affichage des fichiers protégés (photo, bannière, logo).
 *
 * La route `/documents/:id/contenu` revérifie les droits à chaque appel et exige
 * donc un en-tête `Authorization`. Or un `<img src="…">` n'en envoie jamais, et
 * l'URL renvoyée par l'API est relative à l'API, pas au frontend.
 *
 * On récupère donc le binaire via le client API — qui attache le jeton et gère
 * son renouvellement — puis on l'expose au DOM sous forme d'`objectURL`.
 */
import { useEffect, useState } from "react";
import { absoluteApiUrl } from "./urls";
import { getAccessToken } from "./session";

/** Une URL renvoyée par l'API est relative (`/api/v1/documents/…`). */
function isProtected(src?: string | null): src is string {
  return Boolean(
    src && !src.startsWith("http") && !src.startsWith("data:") && src.includes("/documents/"),
  );
}

/**
 * Résout une source d'image utilisable dans un `<img>`.
 *
 * Renvoie `src` inchangé pour les URLs publiques et les data URLs ; télécharge
 * et convertit en `blob:` pour les documents protégés.
 */
export function useProtectedImage(src?: string | null): string | undefined {
  const [resolved, setResolved] = useState<string | undefined>(
    isProtected(src) ? undefined : (src ?? undefined),
  );

  useEffect(() => {
    if (!isProtected(src)) {
      setResolved(src ?? undefined);
      return;
    }

    let active = true;
    let objectUrl: string | undefined;

    const token = getAccessToken();
    void fetch(absoluteApiUrl(src), {
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((response) => (response.ok ? response.blob() : null))
      .then((blob) => {
        if (!active || !blob) return;
        objectUrl = URL.createObjectURL(blob);
        setResolved(objectUrl);
      })
      .catch(() => {
        // Image indisponible : on retombe sur les initiales / le dégradé.
        if (active) setResolved(undefined);
      });

    return () => {
      active = false;
      // Sans révocation, chaque changement de photo fuiterait un blob en mémoire.
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  return resolved;
}

/** Ouvre un document protégé (CV…) dans un nouvel onglet, jeton attaché. */
export async function openProtectedDocument(url: string, filename?: string): Promise<void> {
  const token = getAccessToken();
  const response = await fetch(url.startsWith("http") ? url : absoluteApiUrl(url), {
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error("Téléchargement impossible.");

  const objectUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = objectUrl;
  if (filename) link.download = filename;
  link.target = "_blank";
  link.rel = "noopener";
  link.click();
  // Laisse au navigateur le temps de démarrer le téléchargement.
  setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
}
