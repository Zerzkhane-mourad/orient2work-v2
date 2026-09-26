"use client";

/**
 * Cloche et panneau de notifications — commun à l'Espace Jeune et à l'Espace
 * Entreprise.
 *
 * L'Espace Entreprise recevait des notifications (candidature reçue, créneau
 * réservé, offre validée, rappel d'entretien) sans aucun endroit pour les lire.
 * La même cloche sert maintenant les deux coques ; seul le déclencheur change
 * d'allure pour suivre la barre qui l'accueille.
 *
 * Le composant ne fait QUE composer : fermeture extérieure, bords de
 * défilement, navigation aux flèches et filtre vivent chacun dans leur hook ;
 * le sélecteur « Toutes / Non lues » est celui de la page.
 */
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@/components/ui";
import {
  DUREE_MENU,
  DUREE_PANNEAU,
  useTransitionUI,
} from "@/components/motion/transitions";
import type { Notification } from "@/lib/types";
import { cn } from "@/lib/utils";
import { FiltreLecture } from "./components/filtre-lecture";
import { UnreadBadge } from "./components/unread-badge";
import { APERCU_CLOCHE } from "./constants";
import { useBordsDefilement, type BordsDefilement } from "./hooks/use-bords-defilement";
import { useFermetureExterieure } from "./hooks/use-fermeture-exterieure";
import { useFiltreLecture } from "./hooks/use-filtre-lecture";
import { useNavigationFleches } from "./hooks/use-navigation-fleches";
import { filtrer, grouperParLecture } from "./lib/liste";
import { GLISSEMENT } from "./motion";
import { NotificationItem, NotificationItemSkeleton } from "./notification-item";
import { useNotifications } from "./notifications-store";
import type { FiltreLecture as Filtre, NotificationBellProps } from "./types";

/** Lignes focalisables parcourues par les flèches. */
const LIGNES = "li > a, li > button";

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
  const apparition = useTransitionUI(DUREE_MENU);

  /* ── Ouverture : contrôlée par la coque, ou locale ──────────────────── */

  const [openLocal, setOpenLocal] = useState(false);
  const open = openProp ?? openLocal;
  const setOpen = (valeur: boolean) => {
    if (openProp === undefined) setOpenLocal(valeur);
    onOpenChange?.(valeur);
  };
  const fermer = () => setOpen(false);

  // Refermé à chaque navigation — sinon il resterait ouvert sur la destination.
  const fermerRef = useRef(fermer);
  fermerRef.current = fermer;
  useEffect(() => {
    fermerRef.current();
  }, [chemin]);

  useFermetureExterieure({ ouvert: open, fermer, racine, declencheur });

  /* ── Contenu ─────────────────────────────────────────────────────────── */

  const { filtre, sens, changer } = useFiltreLecture();
  const source = filtrer(notifications, filtre);
  const apercu = source.slice(0, APERCU_CLOCHE);
  const restantes = source.length - apercu.length;

  const { zone, bords, mesurer, descendre, remonter } = useBordsDefilement(
    open,
    `${filtre}:${apercu.length}:${loading}`,
  );
  const naviguer = useNavigationFleches(zone, LIGNES);

  const changerFiltre = (suivant: Filtre) => {
    changer(suivant);
    remonter();
  };

  const libelle =
    unread > 0 ? `Notifications, ${unread} non lue${unread > 1 ? "s" : ""}` : "Notifications";

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
          open || chemin === allHref ? "text-primary" : "text-on-surface-variant hover:text-primary",
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
            animate={{ opacity: 1, scale: 1, y: 0, transition: apparition }}
            exit={{ opacity: 0, scale: 0.96, y: -6, transition: apparition }}
            className={cn(
              "z-50 flex flex-col overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-level-2",
              // Pleine largeur sur petit écran : un panneau de 384 px ancré à
              // droite déborderait d'un téléphone et ferait défiler la page.
              "fixed inset-x-2 origin-top sm:absolute sm:inset-x-auto sm:right-0 sm:w-96 sm:origin-top-right",
              variant === "tab" ? "top-14 sm:top-full" : "top-[4.5rem] sm:top-full sm:mt-3",
            )}
          >
            {/* En-tête : l'ombre n'apparaît qu'une fois la liste défilée — elle
                dit alors qu'il y a du contenu caché au-dessus. */}
            <div
              className={cn(
                "relative z-20 space-y-3 border-b px-4 pb-3 pt-4 transition-shadow duration-200",
                bords.haut ? "border-outline-variant shadow-level-1" : "border-transparent",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon name="notifications" className="text-[18px]" />
                  </span>
                  <h2 className="font-headline text-base font-bold text-primary">Notifications</h2>
                </div>
                {unread > 0 && (
                  <button
                    type="button"
                    onClick={() => void markAllRead()}
                    className="flex min-h-9 items-center gap-1 rounded-full px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
                  >
                    <Icon name="check_circle" className="text-[16px]" /> Tout marquer comme lu
                  </button>
                )}
              </div>

              <FiltreLecture
                filtre={filtre}
                onChange={changerFiltre}
                total={notifications.length}
                unread={unread}
                taille="compact"
              />
            </div>

            <div className="relative min-h-0 flex-1">
              <div
                ref={zone}
                onScroll={mesurer}
                onKeyDown={naviguer}
                // `overflow-x-hidden` : avec `overflow-y-auto`, l'axe X passe
                // aussi en `auto`, et le glissement latéral des filtres ferait
                // surgir une barre horizontale le temps de l'animation.
                // Hauteur bornée (≈ 5 lignes visibles) : un menu, pas une page.
                className="max-h-[min(calc(100dvh-14rem),24rem)] overflow-y-auto overflow-x-hidden overscroll-contain scroll-smooth sm:max-h-[min(55vh,22rem)]"
              >
                {loading ? (
                  <ul aria-label="Chargement des notifications" className="divide-y divide-outline-variant">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <NotificationItemSkeleton key={i} density="compact" />
                    ))}
                  </ul>
                ) : error && notifications.length === 0 ? (
                  <EchecChargement onRetry={refetch} />
                ) : (
                  <ListeFiltree
                    filtre={filtre}
                    sens={sens}
                    apercu={apercu}
                    onArrivee={mesurer}
                    onOpen={(n) => {
                      fermer();
                      void markRead(n.id);
                    }}
                  />
                )}
              </div>

              <FonduBas bords={bords} onDescendre={descendre} />
            </div>

            <Link
              href={allHref}
              onClick={fermer}
              className="group flex items-center justify-center gap-1 border-t border-outline-variant bg-surface-container-low py-3 text-sm font-bold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-secondary"
            >
              Voir toutes les notifications
              {restantes > 0 && (
                <span className="rounded-full bg-primary/10 px-1.5 text-xs tabular-nums">
                  +{restantes}
                </span>
              )}
              <Icon
                name="arrow_forward"
                className="text-[16px] transition-transform duration-200 group-hover:translate-x-1"
              />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Sous-composants ──────────────────────────────────────────────────────── */

/**
 * Liste de l'aperçu, qui glisse du côté du filtre choisi.
 *
 * `mode="wait"` : l'ancienne liste sort avant que la nouvelle n'entre — deux
 * listes superposées le temps d'une transition seraient illisibles.
 */
function ListeFiltree({
  filtre,
  sens,
  apercu,
  onArrivee,
  onOpen,
}: {
  filtre: Filtre;
  sens: 1 | -1;
  apercu: Notification[];
  /** Le nouveau contenu n'existe qu'après la sortie de l'ancien : on remesure alors. */
  onArrivee: () => void;
  onOpen: (notification: Notification) => void;
}) {
  const glisse = useTransitionUI(DUREE_PANNEAU);

  return (
    <AnimatePresence mode="wait" initial={false} custom={sens}>
      <motion.div
        key={filtre}
        custom={sens}
        variants={GLISSEMENT}
        initial="entree"
        animate="present"
        exit="sortie"
        transition={glisse}
        onAnimationComplete={onArrivee}
      >
        {apercu.length === 0 ? (
          <AJour filtre={filtre} />
        ) : (
          // Deux groupes, titres COLLANTS : en défilant, on sait toujours si
          // l'on lit encore du neuf ou déjà de l'ancien.
          <div className="pb-1">
            {grouperParLecture(apercu).map((groupe) => (
              <section key={groupe.titre} aria-label={groupe.titre}>
                <h3 className="sticky top-0 z-10 flex items-center gap-2 border-b border-outline-variant/60 bg-surface-container-lowest/95 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant backdrop-blur">
                  {groupe.neuves && <span className="h-1.5 w-1.5 rounded-full bg-secondary" />}
                  {groupe.titre}
                  <span className="font-semibold tabular-nums opacity-70">
                    · {groupe.items.length}
                  </span>
                </h3>
                <ul className="divide-y divide-outline-variant/70">
                  {groupe.items.map((n) => (
                    <NotificationItem
                      key={n.id}
                      notification={n}
                      density="compact"
                      onOpen={onOpen}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function AJour({ filtre }: { filtre: Filtre }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success-container text-on-success-container">
        <Icon name={filtre === "non-lues" ? "check_circle" : "notifications"} className="text-2xl" />
      </span>
      <p className="mt-3 font-semibold text-primary">Vous êtes à jour</p>
      <p className="mt-1 text-sm text-on-surface-variant">
        {filtre === "non-lues"
          ? "Aucune notification non lue."
          : "Les nouvelles alertes apparaîtront ici."}
      </p>
    </div>
  );
}

function EchecChargement({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-8 text-center" role="alert">
      <Icon name="wifi_off" className="text-2xl text-on-surface-variant" />
      <p className="text-sm text-on-surface-variant">Impossible de charger les notifications.</p>
      <button
        type="button"
        onClick={onRetry}
        className="text-sm font-semibold text-primary hover:underline"
      >
        Réessayer
      </button>
    </div>
  );
}

/**
 * Fondu bas + bouton « plus bas » : tant qu'il reste de la liste sous le pli,
 * on le voit — et on peut y descendre sans molette.
 */
function FonduBas({ bords, onDescendre }: { bords: BordsDefilement; onDescendre: () => void }) {
  return (
    <div
      aria-hidden={!bords.bas}
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-0 flex h-14 items-end justify-center bg-gradient-to-t from-surface-container-lowest to-transparent pb-2 transition-opacity duration-200",
        bords.bas ? "opacity-100" : "opacity-0",
      )}
    >
      <button
        type="button"
        tabIndex={-1}
        onClick={onDescendre}
        aria-label="Faire défiler vers le bas"
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant bg-surface-container-lowest text-primary shadow-level-1 transition-transform hover:translate-y-0.5",
          bords.bas && "pointer-events-auto",
        )}
      >
        <Icon name="expand_more" className="text-[20px]" />
      </button>
    </div>
  );
}
