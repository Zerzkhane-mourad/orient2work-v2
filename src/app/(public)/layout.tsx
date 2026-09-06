import { DefilementDoux } from "@/components/motion/defilement-doux";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";

/**
 * Ossature du site public.
 *
 * `PublicHeader` est monté AVANT `DefilementDoux`, jamais dedans : il est en
 * `position: fixed`, et le lisseur translate son contenu. Placé à l'intérieur,
 * l'en-tête se positionnerait par rapport à ce conteneur translaté et suivrait
 * le défilement au lieu de rester collé en haut.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicHeader />
      <DefilementDoux>
        <main className="flex-1 pt-20">{children}</main>
        <PublicFooter />
      </DefilementDoux>
    </>
  );
}
