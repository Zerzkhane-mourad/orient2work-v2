import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { APP_TAGLINE } from "@/lib/constants";

/** Split layout: brand panel + centered form. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between bg-primary p-12 text-white lg:flex lg:w-2/5">
        <Logo href="/" inverted />
        <div className="space-y-6">
          <h1 className="font-headline text-4xl font-bold leading-tight">{APP_TAGLINE}</h1>
          <p className="max-w-sm text-white/70">
            La passerelle entre jeunes talents et entreprises. Profils vérifiés, formations
            employabilité et opportunités professionnelles.
          </p>
        </div>
        <p className="text-sm text-white/50">© {new Date().getFullYear()} Orient2Work by OMB</p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 flex-col items-center justify-center px-margin-mobile py-12 lg:px-16">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo href="/" />
          </div>
          {children}
          <p className="mt-8 text-center text-sm text-on-surface-variant">
            <Link href="/" className="hover:text-primary">
              ← Retour à l&apos;accueil
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
