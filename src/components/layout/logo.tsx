import Link from "next/link";
import { cn } from "@/lib/utils";
import { APP_NAME, APP_OWNER } from "@/lib/constants";

interface LogoProps {
  href?: string;
  className?: string;
  /** Render on a dark background (navy). */
  inverted?: boolean;
  /**
   * Monogramme carré, pour la barre latérale réduite.
   *
   * Le mot-symbole complet ne tient pas dans un rail de 76px : tronqué, il se
   * lirait « Orient… ». Le monogramme est un OBJET, pas un mot coupé — il tient
   * la place de la marque sans prétendre la dire.
   */
  compact?: boolean;
}

/** Orient2Work wordmark. */
export function Logo({ href = "/", className, inverted, compact }: LogoProps) {
  if (compact) {
    return (
      <Link
        href={href}
        aria-label={`${APP_NAME} by ${APP_OWNER}`}
        title={`${APP_NAME} by ${APP_OWNER}`}
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-lg font-headline text-sm font-bold",
          inverted ? "bg-white text-primary" : "bg-primary text-on-primary",
          className,
        )}
      >
        O2W
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "font-headline text-xl font-bold whitespace-nowrap",
        inverted ? "text-white" : "text-primary",
        className,
      )}
    >
      {APP_NAME}{" "}
      <span className="text-sm font-normal text-secondary-fixed-dim">by {APP_OWNER}</span>
    </Link>
  );
}
