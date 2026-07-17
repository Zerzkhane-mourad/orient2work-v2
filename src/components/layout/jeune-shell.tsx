"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar, Icon } from "@/components/ui";
import { Logo } from "./logo";
import { useProfile } from "@/features/jeune/profil/profile-store";
import type { Notification } from "@/lib/types";
import { cn } from "@/lib/utils";

const primaryNav = [
  { label: "Accueil", href: "/espace-jeune", icon: "dashboard" },
  { label: "Offres", href: "/espace-jeune/offres", icon: "work" },
  { label: "Formations", href: "/espace-jeune/formations", icon: "school" },
  { label: "Candidatures", href: "/espace-jeune/candidatures", icon: "send" },
  { label: "Entretiens", href: "/espace-jeune/entretiens", icon: "event" },
];

const meMenu = [
  { label: "Mon profil", href: "/espace-jeune/profil", icon: "person" },
  { label: "Mes documents", href: "/espace-jeune/documents", icon: "description" },
  { label: "Mon test", href: "/espace-jeune/test", icon: "assignment" },
  { label: "Paramètres", href: "/espace-jeune/parametres", icon: "settings" },
];

interface JeuneShellProps {
  notifications: Notification[];
  children: React.ReactNode;
}

/** LinkedIn-style top navigation shell for the Espace Jeune. */
export function JeuneShell({ notifications, children }: JeuneShellProps) {
  // Live profile — the avatar follows photo edits made on the profil page.
  const { jeune } = useProfile();
  const pathname = usePathname();
  const [meOpen, setMeOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const unread = notifications.filter((n) => !n.read).length;

  const isActive = (href: string) =>
    href === "/espace-jeune" ? pathname === href : pathname.startsWith(href);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-outline-variant bg-surface-container-lowest">
        <div className="mx-auto flex h-14 max-w-container-max items-center gap-3 px-margin-mobile lg:px-6">
          {/* Logo + search */}
          <Logo href="/espace-jeune" className="text-lg" />
          <div className="relative hidden max-w-xs flex-1 md:block">
            <Icon
              name="search"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant"
            />
            <input
              placeholder="Rechercher"
              className="w-full rounded-full border border-transparent bg-surface-container py-1.5 pl-9 pr-3 text-sm focus:border-secondary focus:bg-surface-container-lowest focus:outline-none"
            />
          </div>

          {/* Primary nav */}
          <nav className="ml-auto flex items-stretch">
            {primaryNav.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative hidden min-w-[64px] flex-col items-center justify-center px-2 pt-1 text-[11px] font-medium transition-colors sm:flex",
                    active ? "text-primary" : "text-on-surface-variant hover:text-primary",
                  )}
                >
                  <Icon name={item.icon} filled={active} className="text-2xl" />
                  <span>{item.label}</span>
                  {active && (
                    <span className="absolute -bottom-px h-0.5 w-full rounded-full bg-secondary" />
                  )}
                </Link>
              );
            })}

            {/* Notifications */}
            <div className="relative flex items-center">
              <button
                type="button"
                onClick={() => {
                  setNotifOpen((v) => !v);
                  setMeOpen(false);
                }}
                className={cn(
                  "relative flex min-w-[64px] flex-col items-center justify-center px-2 pt-1 text-[11px] font-medium transition-colors",
                  pathname === "/espace-jeune/notifications"
                    ? "text-primary"
                    : "text-on-surface-variant hover:text-primary",
                )}
              >
                <span className="relative">
                  <Icon name="notifications" filled={notifOpen} className="text-2xl" />
                  {unread > 0 && (
                    <span className="absolute -right-1.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-on-error">
                      {unread}
                    </span>
                  )}
                </span>
                <span>Notifs</span>
              </button>

              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 top-14 z-50 w-80 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-level-2">
                    <div className="flex items-center justify-between border-b border-outline-variant px-4 py-3">
                      <p className="font-bold text-primary">Notifications</p>
                      {unread > 0 && (
                        <span className="rounded-full bg-error-container px-2 py-0.5 text-xs font-bold text-on-error-container">
                          {unread} non lues
                        </span>
                      )}
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.slice(0, 5).map((n) => (
                        <Link
                          key={n.id}
                          href={n.href ?? "/espace-jeune/notifications"}
                          onClick={() => setNotifOpen(false)}
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
                          <div className="min-w-0">
                            <p className="text-sm font-semibold leading-snug text-on-surface">{n.title}</p>
                            <p className="text-xs text-on-surface-variant">{n.time}</p>
                          </div>
                          {!n.read && <span className="ml-auto mt-1 h-2 w-2 shrink-0 rounded-full bg-secondary" />}
                        </Link>
                      ))}
                    </div>
                    <Link
                      href="/espace-jeune/notifications"
                      onClick={() => setNotifOpen(false)}
                      className="block border-t border-outline-variant py-2.5 text-center text-sm font-semibold text-primary hover:bg-surface-container-low"
                    >
                      Voir toutes les notifications
                    </Link>
                  </div>
                </>
              )}
            </div>

            {/* Me dropdown */}
            <div className="relative flex items-center">
              <button
                type="button"
                onClick={() => {
                  setMeOpen((v) => !v);
                  setNotifOpen(false);
                }}
                className="flex min-w-[64px] flex-col items-center justify-center px-2 pt-1 text-[11px] font-medium text-on-surface-variant hover:text-primary"
              >
                <Avatar src={jeune.photo} alt={`${jeune.prenom} ${jeune.nom}`} size={24} />
                <span className="flex items-center gap-0.5">
                  Moi <Icon name="chevron_right" className="rotate-90 text-[14px]" />
                </span>
              </button>

              {meOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMeOpen(false)} />
                  <div className="absolute right-0 top-14 z-50 w-64 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-level-2">
                    <Link
                      href="/espace-jeune/profil"
                      onClick={() => setMeOpen(false)}
                      className="flex items-center gap-3 border-b border-outline-variant p-4 hover:bg-surface-container-low"
                    >
                      <Avatar src={jeune.photo} alt={`${jeune.prenom} ${jeune.nom}`} size={44} />
                      <div>
                        <p className="font-bold text-primary">
                          {jeune.prenom} {jeune.nom}
                        </p>
                        <p className="text-xs text-on-surface-variant">Voir le profil</p>
                      </div>
                    </Link>
                    {meMenu.map((m) => (
                      <Link
                        key={m.href}
                        href={m.href}
                        onClick={() => setMeOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-on-surface-variant hover:bg-surface-container-low hover:text-primary"
                      >
                        <Icon name={m.icon} className="text-[18px]" /> {m.label}
                      </Link>
                    ))}
                    <Link
                      href="/connexion"
                      className="flex items-center gap-3 border-t border-outline-variant px-4 py-2.5 text-sm text-on-surface-variant hover:bg-surface-container-low hover:text-primary"
                    >
                      <Icon name="logout" className="text-[18px]" /> Déconnexion
                    </Link>
                  </div>
                </>
              )}
            </div>

            {/* Mobile menu toggle */}
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="ml-1 flex items-center px-2 text-primary sm:hidden"
              aria-label="Menu"
            >
              <Icon name={mobileOpen ? "close" : "menu"} className="text-2xl" />
            </button>
          </nav>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <nav className="border-t border-outline-variant bg-surface-container-lowest px-margin-mobile py-2 sm:hidden">
            {primaryNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold",
                  isActive(item.href)
                    ? "bg-secondary-container text-on-secondary-container"
                    : "text-on-surface-variant hover:bg-surface-container-low",
                )}
              >
                <Icon name={item.icon} className="text-[20px]" /> {item.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      <main className="mx-auto max-w-container-max px-margin-mobile py-6 lg:px-6">{children}</main>
    </div>
  );
}
