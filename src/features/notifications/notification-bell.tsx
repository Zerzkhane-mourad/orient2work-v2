"use client";

/**
 * Cloche et panneau de notifications — commun à l'Espace Jeune et à l'Espace
 * Entreprise.
 *
 * L'Espace Entreprise recevait des notifications (candidature reçue, créneau
 * réservé, offre validée, rappel d'entretien) sans aucun endroit pour les lire.
 * La même cloche sert maintenant les deux coques ; seul le déclencheur change
 * d'allure pour suivre la barre qui l'accueille.
 */
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@/components/ui";
import { DUREE_MENU, useTransitionUI } from "@/components/motion/transitions";
import { cn } from "@/lib/utils";
import { NotificationItem, NotificationItemSkeleton, UnreadBadge } from "./notification-item";
import { useNotifications } from "./notifications-store";

/** Le panneau est un aperçu : au-delà, la page dédiée prend le relais. */
const APERCU = 6;

interface NotificationBellProps {
  /** Page listant toutes les notifications de l'espace. */
  allHref: string;
  /**
   * `tab` — icône + libellé, pour la barre façon LinkedIn de l'Espace Jeune.
   * `icon` — bouton rond, pour l'en-tête des espaces à barre latérale.
   */
  variant?: "tab" | "icon";
  /** Contrôle externe : la coque referme les autres menus quand la cloche s'ouvre. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

export function NotificationBell({
  allHref,
  variant = "icon",
  open: openProp,
  onOpenChange,
  className,
}: NotificationBellProps) {
  const { notifications, unread, loading, error, refetch, markRead, markAllRead } =
    useNotifications();
  const chemin = usePathname();
  const panelId = useId();
  const racine = useRef<HTMLDivElement>(null);
  const declencheur = useRef<HTMLButtonElement>(null);
  const transition = useTransitionUI(DUREE_MENU);

  const [openLocal, setOpenLocal] = useState(false);
  const open = openProp ?? openLocal;
  const setOpen = (valeur: boolean) => {
    if (openProp === undefined) setOpenLocal(valeur);
    onOpenChange?.(valeur);
  };
  // Ref vers la dernière version : les écouteurs ci-dessous restent posés une
  // seule fois par ouverture au lieu d'être recréés à chaque rendu.
  const fermer = useRef(() => setOpen(false));
  fermer.current = () => setOpen(false);

  // Refermé à chaque navigation — sinon il resterait ouvert sur la destination.
  useEffect(() => {
    fermer.current();
  }, [chemin]);

  /*
   * Clic à l'extérieur et Échap.
   *
   * Un écouteur plutôt qu'un voile invisible en `fixed inset-0` : l'en-tête des
   * espaces à barre latérale porte un `backdrop-blur`, qui fait de lui le bloc
   * conteneur de ses enfants `fixed` — le voile n'aurait couvert que l'en-tête.
   */
  useEffect(() => {
    if (!open) return;
    const auClic = (e: PointerEvent) => {
      if (!racine.current?.contains(e.target as Node)) fermer.current();
    };
    const auClavier = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      fermer.current();
      declencheur.current?.focus();
    };
    document.addEventListener("pointerdown", auClic);
    document.addEventListener("keydown", auClavier);
    return () => {
      document.removeEventListener("pointerdown", auClic);
      document.removeEventListener("keydown", auClavier);
    };
  }, [open]);

  const libelle = unread > 0 ? `Notifications, ${unread} non lue${unread > 1 ? "s" : ""}` : "Notifications";
  const apercu = notifications.slice(0, APERCU);

  return (
    <div ref={racine} className={cn("relative flex items-center", className)}>
      <button
        ref={declencheur}
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        aria-label={libelle}
        title={variant === "icon" ? "Notifications" : undefined}
        className={cn(
          "relative flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary",
          variant === "tab"
            ? "min-h-11 min-w-16 flex-col px-2 pt-1 text-[11px] font-medium"
            : "h-10 w-10 rounded-full hover:bg-surface-container",
          open || chemin === allHref
            ? "text-primary"
            : "text-on-surface-variant hover:text-primary",
          variant === "icon" && open && "bg-surface-container",
        )}
      >
        <span className="relative flex">
          <Icon name={unread > 0 ? "notifications_active" : "notifications"} className="text-2xl" />
          <UnreadBadge count={unread} />
        </span>
        {variant === "tab" && <span>Notifs</span>}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="panneau-notifications"
            id={panelId}
            role="dialog"
            aria-label="Notifications"
            initial={{ opacity: 0, scale: 0.96, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0, transition }}
            exit={{ opacity: 0, scale: 0.96, y: -6, transition }}
            className={cn(
              "z-50 flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-level-2",
              // Pleine largeur sur petit écran : un panneau de 384 px ancré à
              // droite déborderait d'un téléphone et ferait défiler la page.
              "fixed inset-x-2 origin-top sm:absolute sm:inset-x-auto sm:right-0 sm:w-96 sm:origin-top-right",
              variant === "tab" ? "top-14 sm:top-full" : "top-[4.5rem] sm:top-full sm:mt-3",
            )}
          >
            <div className="flex items-center justify-between gap-3 border-b border-outline-variant px-4 py-3">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-primary">Notifications</h2>
                {unread > 0 && (
                  <span className="rounded-full bg-error-container px-2 py-0.5 text-xs font-bold text-on-error-container">
                    {unread}
                  </span>
                )}
              </div>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={() => void markAllRead()}
                  className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-primary transition-colors hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
                >
                  <Icon name="check_circle" className="text-[16px]" /> Tout marquer comme lu
                </button>
              )}
            </div>

            <div className="max-h-[min(60vh,28rem)] overflow-y-auto overscroll-contain">
              {loading ? (
                <ul aria-label="Chargement des notifications" className="divide-y divide-outline-variant">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <NotificationItemSkeleton key={i} density="compact" />
                  ))}
                </ul>
              ) : error && notifications.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-6 py-8 text-center" role="alert">
                  <Icon name="wifi_off" className="text-2xl text-on-surface-variant" />
                  <p className="text-sm text-on-surface-variant">
                    Impossible de charger les notifications.
                  </p>
                  <button
                    type="button"
                    onClick={refetch}
                    className="text-sm font-semibold text-primary hover:underline"
                  >
                    Réessayer
                  </button>
                </div>
              ) : apercu.length === 0 ? (
                <div className="flex flex-col items-center px-6 py-10 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">
                    <Icon name="notifications" className="text-2xl" />
                  </span>
                  <p className="mt-3 font-semibold text-primary">Vous êtes à jour</p>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    Les nouvelles alertes apparaîtront ici.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-outline-variant">
                  {apercu.map((n) => (
                    <NotificationItem
                      key={n.id}
                      notification={n}
                      density="compact"
                      onOpen={() => {
                        setOpen(false);
                        void markRead(n.id);
                      }}
                    />
                  ))}
                </ul>
              )}
            </div>

            <Link
              href={allHref}
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-1 border-t border-outline-variant py-3 text-sm font-semibold text-primary transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-secondary"
            >
              Voir toutes les notifications
              <Icon name="chevron_right" className="text-[18px]" />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
