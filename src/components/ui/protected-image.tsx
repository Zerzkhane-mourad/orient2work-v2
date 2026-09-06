"use client";

/**
 * Image servie par l'API, jeton compris.
 *
 * Photos, bannières et logos ne sont pas des fichiers publics : ils passent par
 * `/documents/:id/contenu`, qui revérifie les droits et exige donc un en-tête
 * `Authorization` — qu'un `<img src="…">` n'envoie jamais. Leur URL est de plus
 * relative à l'API, pas au frontend.
 *
 * `Avatar` réglait déjà le problème pour lui-même ; les bannières, elles,
 * n'avaient pas d'équivalent, et chaque appelant devait penser à
 * `useProtectedImage`. L'un d'eux l'a oublié — la bannière s'affichait sur la
 * page profil et nulle part ailleurs. Ce composant supprime la question :
 * toute image venant de l'API passe par ici.
 */
import { useProtectedImage } from "@/lib/api/media";

interface ProtectedImageProps {
  /** URL renvoyée par l'API — relative, absolue, `data:` ou `blob:`. */
  src?: string | null;
  /** Vide pour une image décorative, doublée par le texte voisin. */
  alt?: string;
  className?: string;
  /**
   * Rendu tant qu'aucune image n'est disponible : absente, en cours de
   * téléchargement, ou refusée. La carte garde ainsi sa hauteur au lieu de
   * sauter quand l'image arrive.
   */
  fallback?: React.ReactNode;
}

export function ProtectedImage({ src, alt = "", className, fallback = null }: ProtectedImageProps) {
  const resolved = useProtectedImage(src);

  if (!resolved) return <>{fallback}</>;

  return (
    // `next/image` refuserait une source `blob:` locale, et n'aurait rien à y
    // optimiser : le binaire est déjà en mémoire.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={resolved} alt={alt} className={className} />
  );
}
