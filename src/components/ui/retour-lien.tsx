import Link from "next/link";
import { Icon } from "./icon";
import { cn } from "@/lib/utils";

/**
 * Lien de retour vers l'écran parent.
 *
 * ── Pourquoi ce n'est pas « le bouton retour du navigateur » ────────────────
 *
 * On arrive sur une fiche par la liste, mais aussi par un lien direct, une
 * notification, un signet. Le bouton du navigateur ramène alors n'importe où —
 * ou nulle part. Ce lien, lui, dit toujours OÙ il mène, et y mène.
 *
 * Six écrans le réécrivaient à l'identique, à un libellé près ; il change ici
 * une fois pour tous, y compris son anneau de focus — que la version recopiée
 * n'avait pas.
 */
export function RetourLien({
  href,
  children,
  className,
}: {
  href: string;
  /** « Retour à la liste », « Retour au catalogue »… */
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-9 items-center gap-1 rounded-full pr-3 text-sm text-on-surface-variant transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2",
        className,
      )}
    >
      <Icon name="arrow_back" className="text-[18px]" />
      {children}
    </Link>
  );
}
