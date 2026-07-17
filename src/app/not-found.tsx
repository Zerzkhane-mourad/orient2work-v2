import { ButtonLink } from "@/components/ui";
import { Logo } from "@/components/layout/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <Logo />
      <p className="font-headline text-7xl font-bold text-primary">404</p>
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-primary">Page introuvable</h1>
        <p className="text-on-surface-variant">La page que vous cherchez n&apos;existe pas ou a été déplacée.</p>
      </div>
      <ButtonLink href="/">Retour à l&apos;accueil</ButtonLink>
    </div>
  );
}
