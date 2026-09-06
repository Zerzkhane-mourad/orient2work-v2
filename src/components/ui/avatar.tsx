"use client";

import { useProtectedImage } from "@/lib/api/media";
import { cn } from "@/lib/utils";

interface AvatarProps {
  src?: string | null;
  alt: string;
  /** Pixel size (square). */
  size?: number;
  className?: string;
}

/** Round avatar with an initials fallback when no image is provided. */
export function Avatar({ src, alt, size = 40, className }: AvatarProps) {
  // Les photos servies par l'API sont protégées par un jeton : `useProtectedImage`
  // les télécharge et renvoie une URL `blob:` affichable.
  const resolved = useProtectedImage(src);

  const initials = alt
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-container-highest text-primary font-semibold",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {resolved ? (
        // `next/image` n'apporte rien sur une URL blob: locale, et refuserait
        // un hôte non déclaré dans next.config.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolved}
          alt={alt}
          width={size}
          height={size}
          className="h-full w-full object-cover"
        />
      ) : (
        <span style={{ fontSize: size * 0.4 }}>{initials}</span>
      )}
    </span>
  );
}
