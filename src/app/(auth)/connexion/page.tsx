import type { Metadata } from "next";
import Link from "next/link";
import { Button, Input } from "@/components/ui";

export const metadata: Metadata = {
  title: "Connexion",
};

export default function ConnexionPage() {
  return (
    <div>
      <h1 className="font-headline text-3xl font-bold text-primary">Bon retour 👋</h1>
      <p className="mt-2 text-on-surface-variant">Connectez-vous pour accéder à votre espace.</p>

      <form className="mt-8 space-y-5">
        <Input label="Email" type="email" placeholder="vous@email.com" required />
        <Input label="Mot de passe" type="password" placeholder="••••••••" required />
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-on-surface-variant">
            <input type="checkbox" className="rounded border-outline-variant text-secondary focus:ring-secondary" />
            Se souvenir de moi
          </label>
          <Link href="#" className="font-semibold text-secondary hover:underline">
            Mot de passe oublié ?
          </Link>
        </div>
        <Button type="submit" size="lg" fullWidth>
          Se connecter
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-on-surface-variant">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="font-semibold text-primary hover:underline">
          S&apos;inscrire
        </Link>
      </p>

      <div className="mt-6 grid grid-cols-3 gap-2 text-center text-xs text-on-surface-variant">
        <Link href="/espace-jeune" className="rounded-lg border border-outline-variant py-2 hover:bg-surface-container">
          Démo Jeune
        </Link>
        <Link href="/espace-entreprise" className="rounded-lg border border-outline-variant py-2 hover:bg-surface-container">
          Démo Entreprise
        </Link>
        <Link href="/admin" className="rounded-lg border border-outline-variant py-2 hover:bg-surface-container">
          Démo Admin
        </Link>
      </div>
    </div>
  );
}
