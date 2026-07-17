import Link from "next/link";
import { cn } from "@/lib/utils";
import { APP_NAME, APP_OWNER } from "@/lib/constants";

interface LogoProps {
  href?: string;
  className?: string;
  /** Render on a dark background (navy). */
  inverted?: boolean;
}

/** Orient2Work wordmark. */
export function Logo({ href = "/", className, inverted }: LogoProps) {
  return (
    <Link
      href={href}
      className={cn("font-headline text-xl font-bold whitespace-nowrap", inverted ? "text-white" : "text-primary", className)}
    >
      {APP_NAME}{" "}
      <span className="text-sm font-normal text-secondary-fixed-dim">by {APP_OWNER}</span>
    </Link>
  );
}
