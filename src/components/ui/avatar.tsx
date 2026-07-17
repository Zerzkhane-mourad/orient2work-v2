import Image from "next/image";
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
      {src ? (
        <Image src={src} alt={alt} width={size} height={size} className="h-full w-full object-cover" />
      ) : (
        <span style={{ fontSize: size * 0.4 }}>{initials}</span>
      )}
    </span>
  );
}
