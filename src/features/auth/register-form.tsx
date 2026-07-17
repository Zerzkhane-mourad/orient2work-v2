"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button, Input, Select } from "@/components/ui";
import { FILIERES, type Role } from "@/lib/constants";
import { cn } from "@/lib/utils";

type RegisterRole = Extract<Role, "jeune" | "entreprise">;

/** Registration form with a jeune / entreprise toggle (§5.1 & §6.1). */
export function RegisterForm() {
  const searchParams = useSearchParams();
  const initial = (searchParams.get("role") as RegisterRole) ?? "jeune";
  const [role, setRole] = useState<RegisterRole>(initial === "entreprise" ? "entreprise" : "jeune");

  return (
    <div>
      <h1 className="font-headline text-3xl font-bold text-primary">Créer un compte</h1>
      <p className="mt-2 text-on-surface-variant">Rejoignez Orient2Work en quelques minutes.</p>

      {/* Role toggle */}
      <div className="mt-6 grid grid-cols-2 rounded-full bg-surface-container p-1">
        {(["jeune", "entreprise"] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            className={cn(
              "rounded-full py-2 text-sm font-semibold transition-colors",
              role === r ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant",
            )}
          >
            {r === "jeune" ? "Jeune talent" : "Entreprise"}
          </button>
        ))}
      </div>

      <form className="mt-6 space-y-4">
        {role === "jeune" ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Prénom" placeholder="Lucas" required />
              <Input label="Nom" placeholder="Dupont" required />
            </div>
            <Input label="Email" type="email" placeholder="vous@email.com" required />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Téléphone" type="tel" placeholder="+212 6 …" required />
              <Input label="Ville" placeholder="Casablanca" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Date de naissance" type="date" required />
              <Select label="Filière" required defaultValue="">
                <option value="" disabled>
                  Sélectionnez…
                </option>
                {FILIERES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </Select>
            </div>
          </>
        ) : (
          <>
            <Input label="Nom du responsable" placeholder="Sophie Martin" required />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Fonction" placeholder="Responsable RH" required />
              <Input label="Téléphone" type="tel" placeholder="+212 5 …" required />
            </div>
            <Input label="Email professionnel" type="email" placeholder="rh@entreprise.ma" required />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Nom de l'entreprise" placeholder="TechSolutions" required />
              <Input label="Ville" placeholder="Casablanca" required />
            </div>
            <Input label="Secteur d'activité" placeholder="Édition de logiciels" required />
          </>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Mot de passe" type="password" placeholder="••••••••" required />
          <Input label="Confirmer" type="password" placeholder="••••••••" required />
        </div>

        {role === "entreprise" && (
          <p className="rounded-lg bg-surface-container px-4 py-3 text-xs text-on-surface-variant">
            <strong>Note :</strong> les comptes entreprise sont validés manuellement par l&apos;équipe
            OMB avant activation.
          </p>
        )}

        <label className="flex items-start gap-2 text-sm text-on-surface-variant">
          <input
            type="checkbox"
            required
            className="mt-0.5 rounded border-outline-variant text-secondary focus:ring-secondary"
          />
          J&apos;accepte les conditions générales d&apos;utilisation et la politique de confidentialité.
        </label>

        <Button type="submit" size="lg" fullWidth>
          Créer mon compte
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-on-surface-variant">
        Déjà inscrit ?{" "}
        <Link href="/connexion" className="font-semibold text-primary hover:underline">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
