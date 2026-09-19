"use client";

/**
 * Ligne de notification — une seule présentation pour la cloche, le tableau de
 * bord et la page dédiée.
 *
 * Trois copies divergeaient : le détail n'apparaissait que sur la page, le
 * point « non lue » changeait de sens d'un écran à l'autre (simple marque ici,
 * bouton là), et une notification sans lien pointait vers `#`.
 */
import Link from "next/link";
import { motion } from "framer-motion";
import { Icon, Skeleton } from "@/components/ui";
import { DUREE_MENU, useTransitionUI } from "@/components/motion/transitions";
import type { Notification } from "@/lib/types";
import { cn } from "@/lib/utils";

interface NotificationItemProps {
  notification: Notification;
  /**
   * `compact` — cloche et tableau de bord : lecture rapide, pas d'actions.
   * `comfortable` — page dédiée : détail complet, marquer comme lue, supprimer.
   */
  density?: "compact" | "comfortable";
  /** Appelé à l'ouverture de la notification (clic sur la ligne). */
  onOpen?: (notification: Notification) => void;
  onMarkRead?: (id: string) => void;
  onRemove?: (id: string) => void;
  className?: string;
}

const dateComplete = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" });

export function NotificationItem({
  notification: n,
  density = "comfortable",
  onOpen,
  onMarkRead,
  onRemove,
  className,
}: NotificationItemProps) {
  const compact = density === "compact";
  const unread = !n.read;

  const contenu = (
    <>
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full",
          compact ? "h-9 w-9" : "h-10 w-10 sm:h-11 sm:w-11",
          n.accent
            ? "bg-secondary-container text-on-secondary-container"
            : "bg-surface-container text-on-surface-variant",
        )}
      >
        <Icon name={n.icon} className={compact ? "text-[18px]" : "text-[20px]"} />
      </span>

      <span className="min-w-0 flex-1">
        {/* Annoncé avant le titre : la graisse et le filet ne se lisent pas à l'oreille. */}
        {unread && <span className="sr-only">Non lue : </span>}
        <span
          className={cn(
            "block leading-snug",
            compact ? "text-sm" : "text-sm sm:text-base",
            unread ? "font-semibold text-on-surface" : "font-medium text-on-surface-variant",
          )}
        >
          {n.title}
        </span>
        {n.detail && (
          <span
            className={cn(
              "mt-0.5 block text-on-surface-variant",
              compact ? "line-clamp-2 text-xs" : "text-sm",
            )}
          >
            {n.detail}
          </span>
        )}
        <time
          dateTime={n.createdAt}
          title={dateComplete.format(new Date(n.createdAt))}
          className={cn(
            "mt-1 block text-xs",
            unread ? "font-semibold text-secondary" : "text-on-surface-variant",
          )}
        >
          {n.time}
        </time>
      </span>
    </>
  );

  const zone = cn(
    "flex min-w-0 flex-1 items-start gap-3 rounded-lg text-left",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest",
  );

  return (
    <li
      className={cn(
        "group relative flex items-start gap-2 transition-colors",
        compact ? "px-4 py-3" : "px-4 py-4 sm:px-5",
        unread
          ? "bg-surface-container-low hover:bg-surface-container"
          : "hover:bg-surface-container-low",
        className,
      )}
    >
      {/* Filet de marge : repérable d'un coup d'œil, même en balayant la liste. */}
      {unread && (
        <span aria-hidden className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-secondary" />
      )}

      {n.href ? (
        <Link href={n.href} onClick={() => onOpen?.(n)} className={zone}>
          {contenu}
        </Link>
      ) : (
        <button type="button" onClick={() => onOpen?.(n)} className={zone}>
          {contenu}
        </button>
      )}

      {!compact && (onMarkRead || onRemove) && (
        /*
         * Sur un écran à souris, les actions n'apparaissent qu'au survol ou au
         * focus : la liste reste lisible. Sur écran tactile, il n'y a pas de
         * survol — elles restent donc visibles, sinon supprimer serait
         * impossible au doigt.
         */
        <div className="flex shrink-0 items-center gap-0.5 transition-opacity group-focus-within:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100">
          {unread && onMarkRead && (
            <ActionButton label="Marquer comme lue" icon="check" onClick={() => onMarkRead(n.id)} />
          )}
          {onRemove && (
            <ActionButton
              label="Supprimer la notification"
              icon="delete"
              danger
              onClick={() => onRemove(n.id)}
            />
          )}
        </div>
      )}
    </li>
  );
}

function ActionButton({
  label,
  icon,
  danger,
  onClick,
}: {
  label: string;
  icon: "check" | "delete";
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary",
        danger ? "hover:bg-error-container hover:text-error" : "hover:bg-surface-container-high hover:text-primary",
      )}
    >
      <Icon name={icon} className="text-[18px]" />
    </button>
  );
}

/** Squelette au gabarit exact d'une ligne : la liste ne saute pas à l'arrivée des données. */
export function NotificationItemSkeleton({ density = "comfortable" }: { density?: "compact" | "comfortable" }) {
  const compact = density === "compact";
  return (
    <li className={cn("flex items-start gap-3", compact ? "px-4 py-3" : "px-4 py-4 sm:px-5")}>
      <Skeleton className={cn("shrink-0 rounded-full", compact ? "h-9 w-9" : "h-11 w-11")} />
      <div className="flex-1 space-y-2 pt-1">
        <Skeleton className="h-3.5 w-3/4" />
        {!compact && <Skeleton className="h-3 w-1/2" />}
        <Skeleton className="h-2.5 w-16" />
      </div>
    </li>
  );
}

/**
 * Pastille chiffrée posée sur une icône.
 *
 * Plafonnée à « 9+ » : au-delà, le nombre exact n'aide plus à décider, et une
 * pastille qui s'élargit déborde de l'icône. Elle rebondit brièvement quand le
 * compteur change — c'est le seul signal qu'une notification vient d'arriver.
 * Décorative (`aria-hidden`) : le nombre est porté par le libellé du bouton.
 */
export function UnreadBadge({ count, className }: { count: number; className?: string }) {
  const transition = useTransitionUI(DUREE_MENU);
  if (count <= 0) return null;
  const label = count > 9 ? "9+" : String(count);

  return (
    <motion.span
      key={label}
      aria-hidden
      initial={{ scale: 0.6 }}
      animate={{ scale: 1 }}
      transition={transition}
      className={cn(
        "absolute -right-2 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold leading-none text-on-error ring-2 ring-surface-container-lowest",
        className,
      )}
    >
      {label}
    </motion.span>
  );
}
