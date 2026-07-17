import Link from "next/link";
import { Logo } from "./logo";
import { APP_NAME, APP_OWNER } from "@/lib/constants";

const footerColumns = [
  {
    title: "Navigation",
    links: [
      { label: "Accueil", href: "/" },
      { label: "À propos", href: "/a-propos" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Plateforme",
    links: [
      { label: "Pour les jeunes", href: "/jeunes" },
      { label: "Pour les entreprises", href: "/entreprises" },
    ],
  },
  {
    title: "Ressources",
    links: [
      { label: "Centre d'aide", href: "/contact" },
      { label: "Forums entreprises", href: "/a-propos" },
      { label: "Newsletter", href: "/contact" },
    ],
  },
  {
    title: "Légal",
    links: [
      { label: "Mentions légales", href: "#" },
      { label: "Confidentialité", href: "#" },
      { label: "CGU", href: "#" },
    ],
  },
];

export function PublicFooter() {
  return (
    <footer className="border-t border-outline-variant bg-surface-container-lowest pb-10 pt-16">
      <div className="mx-auto max-w-container-max px-margin-mobile lg:px-margin-desktop">
        <div className="mb-14 grid grid-cols-2 gap-10 md:grid-cols-4">
          {footerColumns.map((col) => (
            <div key={col.title}>
              <h4 className="mb-5 font-bold text-primary">{col.title}</h4>
              <ul className="space-y-3 text-sm text-on-surface-variant">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="transition-colors hover:text-secondary">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-col items-center justify-between gap-4 border-t border-outline-variant pt-8 md:flex-row">
          <Logo />
          <p className="text-xs text-on-surface-variant">
            © {new Date().getFullYear()} {APP_NAME} by {APP_OWNER}. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
}
