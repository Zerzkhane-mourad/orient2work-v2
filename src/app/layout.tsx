import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import { SessionProvider } from "@/features/auth/session-provider";
import "./globals.css";

/*
 * Le couple typographique porte l'essentiel de l'identité.
 *
 * Inter et Plus Jakarta Sans étaient corrects et parfaitement anonymes : c'est
 * l'appariement par défaut de la moitié des produits SaaS. Pour une plateforme
 * d'orientation adossée à un organisme, il faut quelque chose qui tienne devant
 * un DRH sans ressembler au voisin.
 *
 * Bricolage Grotesque : grotesque variable, légèrement condensée, un peu
 * institutionnelle. Du caractère dans les grands corps, sobre dans les petits.
 * Instrument Sans : neutre mais pas fade, avec des formes plus ouvertes
 * qu'Inter, donc plus lisible en petit corps sur mobile.
 *
 * Les deux couvrent les diacritiques françaises.
 */
const titres = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-headline",
  display: "swap",
});

const texte = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Orient2Work by OMB — De l'orientation à l'opportunité professionnelle",
    template: "%s | Orient2Work by OMB",
  },
  description:
    "La passerelle entre jeunes talents et entreprises. Profils vérifiés, formations employabilité et opportunités professionnelles.",
};

/**
 * `viewport-fit: cover` : sans lui, iOS ne renseigne pas `env(safe-area-inset-*)`
 * et la barre d'onglets de l'Espace Jeune passerait sous l'indicateur d'accueil.
 *
 * Le zoom reste AUTORISÉ — `maximumScale` non borné. Le brider est un réflexe
 * courant sur les interfaces mobiles ; c'est aussi retirer à un utilisateur
 * malvoyant le seul moyen d'agrandir un texte.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${titres.variable} ${texte.variable}`} suppressHydrationWarning>
      <body className="min-h-screen flex flex-col antialiased" suppressHydrationWarning>
        
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
