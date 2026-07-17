"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./logo";
import { Avatar, Icon } from "@/components/ui";
import type { NavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

interface AppUser {
  name: string;
  role: string; // display label under the name
  photo?: string;
}

interface AppShellProps {
  nav: NavItem[];
  user: AppUser;
  /** Home href for the space, used to detect the exact dashboard route. */
  homeHref: string;
  roleLabel: string;
  children: React.ReactNode;
}

/** Sidebar + top-bar layout for every authenticated space. */
export function AppShell({ nav, user, homeHref, roleLabel, children }: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) =>
    href === homeHref ? pathname === href : pathname.startsWith(href);

  const sidebar = (
    <div className="flex h-full flex-col gap-2">
      <div className="flex h-16 items-center px-2">
        <Logo href={homeHref} />
      </div>
      <span className="px-4 pb-2 pt-3 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
        {roleLabel}
      </span>
      <nav className="flex flex-1 flex-col gap-1">
        {nav.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all",
                active
                  ? "bg-secondary-container text-on-secondary-container"
                  : "text-on-surface-variant hover:bg-surface-container",
              )}
            >
              <Icon name={item.icon} filled={active} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <Link
        href="/connexion"
        className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-semibold text-on-surface-variant hover:bg-surface-container"
      >
        <Icon name="logout" />
        Déconnexion
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-outline-variant bg-surface-container-lowest px-3 py-2 lg:block">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-primary/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-surface-container-lowest px-3 py-2 shadow-level-2">
            {sidebar}
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b border-outline-variant bg-background/80 px-margin-mobile backdrop-blur-md lg:px-8">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-full p-2 text-primary hover:bg-surface-container lg:hidden"
            aria-label="Ouvrir le menu"
          >
            <Icon name="menu" />
          </button>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container"
              aria-label="Notifications"
            >
              <Icon name="notifications" />
            </button>
            <div className="flex items-center gap-3 border-l border-outline-variant pl-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold leading-tight text-on-surface">{user.name}</p>
                <p className="text-xs text-on-surface-variant">{user.role}</p>
              </div>
              <Avatar src={user.photo} alt={user.name} size={40} />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-container-max px-margin-mobile py-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
