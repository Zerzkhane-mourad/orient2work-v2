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
import { Avatar, Icon, RetourEnHaut } from "@/components/ui";
import { Logo } from "./logo";
import { JeuneBottomNav } from "./jeune-bottom-nav";
import { estActif, estImmersif, NAV_COMPTE, NAV_DESKTOP } from "./jeune-nav";
import { LogoutButton } from "@/features/auth/logout-button";
import { useProfile } from "@/features/jeune/profil/profile-store";
import { useNotifications } from "@/features/notifications/use-notifications";
import { RechercheNavbar } from "@/features/recherche/recherche-navbar";
import { useDefilement } from "@/lib/use-defilement";
import { cn } from "@/lib/utils";

export function JeuneShell({ children }: { children: React.ReactNode }) {
  // Profil vivant : l'avatar suit les modifications faites sur la page profil.
  const { jeune } = useProfile();
  const { notifications, unread, markRead } = useNotifications(10);
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
                  {actif && (
                    <span className="absolute -bottom-px h-0.5 w-full rounded-full bg-secondary" />
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
              <Icon name={rechercheOuverte ? "close" : "search"} className="text-2xl" />
            </button>

            <PanneauNotifications
              ouvert={notifOpen}
              onToggle={() => {
                setNotifOpen((v) => !v);
                setMeOpen(false);
              }}
              onClose={() => setNotifOpen(false)}
              notifications={notifications}
              unread={unread}
              markRead={markRead}
              actif={chemin === "/espace-jeune/notifications"}
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
                  Moi <Icon name="chevron_right" className="rotate-90 text-[14px]" />
                </span>
              </button>

              {meOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMeOpen(false)} />
                  <div className="absolute right-0 top-14 z-50 w-64 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-level-2">
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
                  </div>
                </>
              )}
            </div>
          </nav>
        </div>

        {/* Recherche dépliée sur mobile — sous la barre, pleine largeur. */}
        {rechercheOuverte && (
          <div className="border-t border-outline-variant px-margin-mobile py-2 md:hidden">
            <RechercheNavbar autoFocus onNavigated={() => setRechercheOuverte(false)} />
          </div>
        )}
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

/**
 * Cloche et panneau de notifications.
 *
 * Le panneau était large de 320 px et ancré à droite : sur un écran de 320 px,
 * il dépassait du cadre et emportait la page en défilement horizontal. Il
 * s'étend maintenant d'un bord à l'autre tant que la place manque.
 */
function PanneauNotifications({
  ouvert,
  onToggle,
  onClose,
  notifications,
  unread,
  markRead,
  actif,
}: {
  ouvert: boolean;
  onToggle: () => void;
  onClose: () => void;
  notifications: ReturnType<typeof useNotifications>["notifications"];
  unread: number;
  markRead: ReturnType<typeof useNotifications>["markRead"];
  actif: boolean;
}) {
  return (
    /*
     * Masqué sur mobile : les notifications y sont devenues un ONGLET de la
     * barre du bas, avec leur pastille. Les laisser aussi ici les mettrait à
     * deux endroits à la fois, et la cloche du haut serait le mauvais des deux
     * — hors du champ du pouce, et sans compteur visible en permanence.
     */
    <div className="relative hidden items-center sm:flex">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={ouvert}
        aria-label={unread > 0 ? `Notifications, ${unread} non lues` : "Notifications"}
        className={cn(
          "relative flex min-h-11 min-w-11 flex-col items-center justify-center px-2 pt-1 text-[11px] font-medium transition-colors sm:min-w-16",
          actif ? "text-primary" : "text-on-surface-variant hover:text-primary",
        )}
      >
        <span className="relative">
          <Icon name="notifications" filled={ouvert} className="text-2xl" />
          {unread > 0 && (
            <span className="absolute -right-1.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-on-error">
              {unread}
            </span>
          )}
        </span>
        <span className="hidden sm:block">Notifs</span>
      </button>

      {ouvert && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          {/* `fixed` sur mobile pour se poser d'un bord à l'autre, `absolute`
              dès que le panneau tient sous la cloche. */}
          <div className="fixed inset-x-2 top-14 z-50 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-level-2 sm:absolute sm:inset-x-auto sm:right-0 sm:w-80">
            <div className="flex items-center justify-between border-b border-outline-variant px-4 py-3">
              <p className="font-bold text-primary">Notifications</p>
              {unread > 0 && (
                <span className="rounded-full bg-error-container px-2 py-0.5 text-xs font-bold text-on-error-container">
                  {unread} non lues
                </span>
              )}
            </div>

            <div className="max-h-[60vh] overflow-y-auto overscroll-contain sm:max-h-96">
              {notifications.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-on-surface-variant">
                  Aucune notification.
                </p>
              )}
              {notifications.slice(0, 5).map((n) => (
                <Link
                  key={n.id}
                  href={n.href ?? "/espace-jeune/notifications"}
                  onClick={() => {
                    onClose();
                    if (!n.read) void markRead(n.id);
                  }}
                  className={cn(
                    "flex gap-3 border-b border-outline-variant px-4 py-3 last:border-0 hover:bg-surface-container-low",
                    !n.read && "bg-surface-container-low",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                      n.accent
                        ? "bg-secondary-container text-on-secondary-container"
                        : "bg-surface-container text-on-surface-variant",
                    )}
                  >
                    <Icon name={n.icon} className="text-[18px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-snug text-on-surface">{n.title}</p>
                    <p className="text-xs text-on-surface-variant">{n.time}</p>
                  </div>
                  {!n.read && (
                    <span className="ml-auto mt-1 h-2 w-2 shrink-0 rounded-full bg-secondary" />
                  )}
                </Link>
              ))}
            </div>

            <Link
              href="/espace-jeune/notifications"
              onClick={onClose}
              className="block border-t border-outline-variant py-3 text-center text-sm font-semibold text-primary hover:bg-surface-container-low"
            >
              Voir toutes les notifications
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
