"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./logo";
import { Icon, ButtonLink } from "@/components/ui";
import { publicNav } from "@/lib/navigation";
import { cn } from "@/lib/utils";

/** Public site top navigation with a responsive mobile menu. */
export function PublicHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 z-50 flex h-20 w-full items-center border-b border-outline-variant bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-container-max items-center justify-between px-margin-mobile lg:px-margin-desktop">
        <div className="flex items-center gap-10">
          <Logo />
          <nav className="hidden items-center gap-7 lg:flex">
            {publicNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-sm font-semibold transition-colors hover:text-primary",
                  pathname === item.href ? "text-primary" : "text-on-surface-variant",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <ButtonLink href="/connexion" variant="outline" size="sm">
            Connexion
          </ButtonLink>
          <ButtonLink href="/inscription" variant="secondary" size="sm">
            S&apos;inscrire
          </ButtonLink>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-full p-2 text-primary hover:bg-surface-container lg:hidden"
          aria-label="Menu"
          aria-expanded={open}
        >
          <Icon name={open ? "close" : "menu"} />
        </button>
      </div>

      {open && (
        <div className="absolute left-0 top-20 w-full border-b border-outline-variant bg-background px-margin-mobile py-4 lg:hidden">
          <nav className="flex flex-col gap-1">
            {publicNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-on-surface-variant hover:bg-surface-container"
              >
                <Icon name={item.icon} className="text-secondary" />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-2">
            <ButtonLink href="/connexion" variant="outline" fullWidth>
              Connexion
            </ButtonLink>
            <ButtonLink href="/inscription" variant="secondary" fullWidth>
              S&apos;inscrire
            </ButtonLink>
          </div>
        </div>
      )}
    </header>
  );
}
