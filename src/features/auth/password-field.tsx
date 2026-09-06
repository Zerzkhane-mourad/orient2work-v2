"use client";

/**
 * Champ mot de passe avec contrôle de la politique côté client.
 *
 * Les règles sont celles du backend (`validators/common.validator.ts`) :
 * 12 caractères minimum, une majuscule, une minuscule, un chiffre. La
 * validation reste évidemment refaite côté serveur — celle-ci n'est là que pour
 * éviter un aller-retour et un 422 sur un champ qu'on peut vérifier ici.
 */
import { useState } from "react";
import { Icon, Input } from "@/components/ui";
import { cn } from "@/lib/utils";

export const PASSWORD_RULES = [
  { label: "12 caractères minimum", test: (v: string) => v.length >= 12 },
  { label: "Une majuscule", test: (v: string) => /[A-Z]/.test(v) },
  { label: "Une minuscule", test: (v: string) => /[a-z]/.test(v) },
  { label: "Un chiffre", test: (v: string) => /\d/.test(v) },
] as const;

export function isPasswordValid(value: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(value));
}

interface PasswordFieldProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  /** Masque la liste des règles tant que l'utilisateur n'a rien saisi. */
  showRules?: boolean;
  error?: string;
  autoComplete?: string;
}

export function PasswordField({
  label = "Mot de passe",
  value,
  onChange,
  showRules = true,
  error,
  autoComplete = "new-password",
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const [focus, setFocus] = useState(false);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          label={label}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          placeholder="••••••••"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          error={error}
          required
          // Place réservée au bouton, qui se superpose au champ.
          className="pr-12"
        />

        {/*
          Afficher/masquer : sur mobile, saisir douze caractères à l'aveugle
          contre une politique stricte est une cause d'abandon classique. Le
          bouton fait 44 px de côté, la taille minimale d'une cible tactile.
        */}
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          aria-pressed={visible}
          className={cn(
            "absolute right-1 flex h-11 w-11 items-center justify-center rounded-lg",
            // Aligné sur le champ, sous le libellé qu'il ne doit pas recouvrir.
            label ? "top-7" : "top-0",
            "text-on-surface-variant transition-colors hover:text-primary",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary",
          )}
        >
          <Icon name={visible ? "visibility_off" : "visibility"} className="text-[20px]" />
        </button>
      </div>

      {/*
        Critères montrés dès la prise de focus, et non à la première frappe :
        les découvrir en cours de saisie oblige à recommencer.
      */}
      {showRules && (focus || value.length > 0) && (
        <ul className="grid gap-1 sm:grid-cols-2">
          {PASSWORD_RULES.map((rule) => {
            const passed = rule.test(value);
            return (
              <li
                key={rule.label}
                className={cn(
                  "flex items-center gap-1.5 text-xs",
                  passed ? "text-success" : "text-on-surface-variant",
                )}
              >
                <Icon
                  name={passed ? "check_circle" : "radio_button_unchecked"}
                  className="text-[14px]"
                />
                {rule.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
