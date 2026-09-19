"use client";

/**
 * Coque de l'Espace Jeune.
 *
 * Deux navigations pour un seul jeu de destinations (`jeune-nav.ts`) :
 *  • écran large — barre supérieure complète, à la façon de LinkedIn ;
 *  • mobile — barre d'onglets EN BAS (`JeuneBottomNav`), là où va le pouce.
 *
 * Le menu « hamburger » a disparu : il masquait toute la navigation derrière un
 * geste, et son panneau repoussait la page vers le bas à chaque ouverture.
 *
 * La barre du haut se réduit alors sur mobile à ce qui n'est pas une
 * destination — chercher, être alerté, son compte.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Avatar, Icon, RetourEnHaut } from "@/components/ui";
import {
  COURBE_SORTIE,
  DUREE_MENU,
  DUREE_PANNEAU,
  DUREE_VOILE,
  useTransitionUI,
} from "@/components/motion/transitions";
import { Logo } from "./logo";
import { JeuneBottomNav } from "./jeune-bottom-nav";
import { estActif, estImmersif, NAV_COMPTE, NAV_DESKTOP } from "./jeune-nav";
import { LogoutButton } from "@/features/auth/logout-button";
import { useProfile } from "@/features/jeune/profil/profile-store";
import { NotificationBell } from "@/features/notifications/notification-bell";
import {
  NotificationsProvider,
  useNotifications,
} from "@/features/notifications/notifications-store";
import { RechercheNavbar } from "@/features/recherche/recherche-navbar";
import { useDefilement } from "@/lib/use-defilement";
import { cn } from "@/lib/utils";

/**
 * Le fournisseur de notifications enveloppe toute la coque : la cloche, la
 * pastille de la barre du bas et les pages lisent la même liste.
 */
export function JeuneShell({ children }: { children: React.ReactNode }) {
  return (
    <NotificationsProvider>
      <CoqueJeune>{children}</CoqueJeune>
    </NotificationsProvider>
  );
}

function CoqueJeune({ children }: { children: React.ReactNode }) {
  // Profil vivant : l'avatar suit les modifications faites sur la page profil.
  const { jeune } = useProfile();
  const { unread } = useNotifications();
  const chemin = usePathname();

  const [meOpen, setMeOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [rechercheOuverte, setRechercheOuverte] = useState(false);

  const immersif = estImmersif(chemin);

  /*
   * L'en-tête collant était plat : rien ne disait que du contenu passait
   * dessous, et une carte blanche qui s'y glissait donnait l'impression que la
   * page était coupée. L'ombre n'apparaît qu'une fois le défilement commencé —
   * en haut de page, il n'y a rien à séparer.
   */
  const defile = useDefilement(8);

  /*
   * Trois cadences, une seule source (`motion/transitions`) : le filet qui
   * suit l'onglet actif, les menus ancrés sous leur bouton, et la recherche
   * dépliée qui pousse le contenu de la page.
   */
  const transitionFilet = useTransitionUI(DUREE_VOILE);
  const transitionMenu = useTransitionUI(DUREE_MENU);
  const transitionPanneau = useTransitionUI(DUREE_PANNEAU);
  const transitionPanneauSortie = useTransitionUI(DUREE_MENU, COURBE_SORTIE);

  // Les panneaux se referment au changement de page : ils resteraient sinon
  // ouverts par-dessus la destination que l'on vient d'atteindre.
  useEffect(() => {
    setMeOpen(false);
    setNotifOpen(false);
    setRechercheOuverte(false);
  }, [chemin]);

  return (
    <div className="min-h-screen bg-background">
      <header
        className={cn(
          "sticky top-0 z-50 border-b bg-surface-container-lowest transition-shadow duration-200",
          defile ? "border-transparent shadow-level-2" : "border-outline-variant",
        )}
      >
        <div className="mx-auto flex h-14 max-w-container-max items-center gap-3 px-margin-mobile lg:px-6">
          <Logo href="/espace-jeune" className="text-lg" />

          {/*
            Recherche en clair dès que la place existe.

            La recherche est GLOBALE : offres, formations et entreprises
            ouvertes aux candidatures spontanées, groupées sous le champ.
          */}
          <div className="relative hidden max-w-xs flex-1 md:block">
            <RechercheNavbar />
          </div>

          <nav className="ml-auto flex items-stretch" aria-label="Navigation principale">
            {NAV_DESKTOP.map((item) => {
              const actif = estActif(item.href, chemin);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={actif ? "page" : undefined}
                  className={cn(
                    "relative hidden min-w-16 flex-col items-center justify-center px-2 pt-1 text-[11px] font-medium transition-colors sm:flex",
                    actif ? "text-primary" : "text-on-surface-variant hover:text-primary",
                  )}
                >
                  <Icon name={item.icon} filled={actif} className="text-2xl" />
                  <span>{item.court ?? item.label}</span>
                  {/* Un seul filet pour toute la barre (`layoutId`) : il GLISSE
                      d'un onglet à l'autre au lieu de s'éteindre ici pour se
                      rallumer là. C'est ce qui relie la page quittée à celle
                      qu'on ouvre. */}
                  {actif && (
                    <motion.span
                      layoutId="onglet-actif-desktop"
                      transition={transitionFilet}
                      className="absolute -bottom-px h-0.5 w-full rounded-full bg-secondary"
                    />
                  )}
                </Link>
              );
            })}

            {/* Loupe : sur mobile la recherche n'a pas la place d'être ouverte
                en permanence, mais elle ne doit pas disparaître pour autant. */}
            <button
              type="button"
              onClick={() => setRechercheOuverte((v) => !v)}
              aria-expanded={rechercheOuverte}
              aria-label="Rechercher une offre"
              className="flex min-h-11 min-w-11 items-center justify-center text-on-surface-variant hover:text-primary md:hidden"
            >
              {/*
                Loupe et croix se relaient dans un quart de tour.

                Elles se remplaçaient d'une image à l'autre : au moment même où
                le champ commence à se déplier, l'icône avait déjà changé — deux
                gestes sans rapport pour un seul appui. La rotation les tient
                ensemble, et la boîte de taille fixe empêche la barre de sauter
                pendant le croisement.
              */}
              <span className="relative flex h-6 w-6 items-center justify-center">
                <AnimatePresence initial={false} mode="popLayout">
                  <motion.span
                    key={rechercheOuverte ? "fermer" : "chercher"}
                    initial={{ opacity: 0, rotate: -90, scale: 0.7 }}
                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                    exit={{ opacity: 0, rotate: 90, scale: 0.7 }}
                    transition={transitionMenu}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <Icon name={rechercheOuverte ? "close" : "search"} className="text-2xl" />
                  </motion.span>
                </AnimatePresence>
              </span>
            </button>

            {/*
              Masquée sur mobile : les notifications y sont un ONGLET de la
              barre du bas, avec leur pastille. Les laisser aussi ici les
              mettrait à deux endroits, et la cloche du haut serait le mauvais
              des deux — hors du champ du pouce.
            */}
            <NotificationBell
              allHref="/espace-jeune/notifications"
              variant="tab"
              className="hidden sm:flex"
              open={notifOpen}
              onOpenChange={(ouvert) => {
                setNotifOpen(ouvert);
                if (ouvert) setMeOpen(false);
              }}
            />

            <div className="relative flex items-center">
              <button
                type="button"
                onClick={() => {
                  setMeOpen((v) => !v);
                  setNotifOpen(false);
                }}
                aria-expanded={meOpen}
                aria-label="Mon compte"
                className="flex min-h-11 min-w-11 flex-col items-center justify-center px-2 pt-1 text-[11px] font-medium text-on-surface-variant hover:text-primary sm:min-w-16"
              >
                <Avatar src={jeune.photo} alt={`${jeune.prenom} ${jeune.nom}`} size={24} />
                <span className="hidden items-center gap-0.5 sm:flex">
                  Moi{" "}
                  {/* Le chevron pointe vers le bas au repos, vers le haut une
                      fois le menu ouvert : il dit dans quel sens va le geste. */}
                  <motion.span
                    animate={{ rotate: meOpen ? 270 : 90 }}
                    transition={transitionMenu}
                    className="block"
                  >
                    <Icon name="chevron_right" className="block text-[14px]" />
                  </motion.span>
                </span>
              </button>

              {/* Capteur de clic hors du menu — hors `AnimatePresence` : il est
                  invisible, il n'a donc rien à animer, et le faire sortir avec
                  le menu le laisserait avaler les clics une fraction de seconde
                  après sa fermeture. */}
              {meOpen && (
                <div className="fixed inset-0 z-40" onClick={() => setMeOpen(false)} />
              )}

              <AnimatePresence>
                {meOpen && (
                  /* `origin-top-right` : le menu se déploie DEPUIS son bouton,
                     au lieu de grandir depuis son propre centre. */
                  <motion.div
                    key="menu-compte"
                    initial={{ opacity: 0, scale: 0.95, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0, transition: transitionMenu }}
                    exit={{ opacity: 0, scale: 0.95, y: -6, transition: transitionMenu }}
                    className="absolute right-0 top-14 z-50 w-64 origin-top-right overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-level-2"
                  >
                    <Link
                      href="/espace-jeune/profil"
                      className="flex items-center gap-3 border-b border-outline-variant p-4 hover:bg-surface-container-low"
                    >
                      <Avatar src={jeune.photo} alt={`${jeune.prenom} ${jeune.nom}`} size={44} />
                      <div className="min-w-0">
                        <p className="truncate font-bold text-primary">
                          {jeune.prenom} {jeune.nom}
                        </p>
                        <p className="text-xs text-on-surface-variant">Voir le profil</p>
                      </div>
                    </Link>
                    {NAV_COMPTE.map((m) => (
                      <Link
                        key={m.href}
                        href={m.href}
                        className="flex min-h-11 items-center gap-3 px-4 text-sm text-on-surface-variant hover:bg-surface-container-low hover:text-primary"
                      >
                        <Icon name={m.icon} className="text-[18px]" /> {m.label}
                      </Link>
                    ))}
                    <LogoutButton className="w-full border-t border-outline-variant px-4 py-2.5 text-left text-sm text-on-surface-variant hover:bg-surface-container-low hover:text-primary" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav>
        </div>

        {/*
          Recherche dépliée sur mobile — sous la barre, pleine largeur.

          Elle se DÉPLIE : la hauteur est animée, et non seulement l'opacité.
          Ce panneau pousse toute la page vers le bas ; apparu d'un coup, il
          déplaçait le contenu d'une soixantaine de pixels sans prévenir, et
          l'on perdait la ligne qu'on était en train de lire.

          `overflow-hidden` sur l'enveloppe, bordure et marges sur l'enfant :
          à hauteur nulle, un `border-t` porté par l'enveloppe laisserait un
          filet d'un pixel en travers de l'en-tête.
        */}
        <AnimatePresence initial={false}>
          {rechercheOuverte && (
            <motion.div
              key="recherche-mobile"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1, transition: transitionPanneau }}
              exit={{ height: 0, opacity: 0, transition: transitionPanneauSortie }}
              className="overflow-hidden md:hidden"
            >
              <div className="border-t border-outline-variant px-margin-mobile py-2">
                <RechercheNavbar autoFocus onNavigated={() => setRechercheOuverte(false)} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/*
        `pb-nav-mobile` : la barre d'onglets est en position fixe, elle
        recouvrirait sinon le dernier bouton de chaque page — et la mesure
        inclut l'encoche iOS.
      */}
      <main
        className={cn(
          "mx-auto max-w-container-max px-margin-mobile pt-6 lg:px-6",
          // Sans barre d'onglets, pas de hauteur à réserver — l'écran immersif
          // gère lui-même le dégagement de sa propre barre d'action.
          immersif ? "pb-6" : "pb-nav-mobile sm:pb-6",
        )}
      >
        {children}
      </main>

      {/* Décalé au-dessus de la barre d'onglets, qu'il recouvrirait sinon.
          En mode immersif il n'y a pas de barre : le bouton redescend. */}
      <RetourEnHaut className={immersif ? undefined : "bottom-20 sm:bottom-4"} />

      <JeuneBottomNav unread={unread} />
    </div>
  );
}
