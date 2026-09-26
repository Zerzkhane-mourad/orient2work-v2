"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader, CardTitle, ErrorBanner, Icon } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { EntrepriseThemeId } from "@/lib/api/types";
import { useEntreprise } from "./entreprise-store";
import { apercuDepuisCouleur } from "./theme-from-color";
import { DEFAULT_ENTREPRISE_THEME, ENTREPRISE_THEMES, THEME_AUTO } from "./themes";

/**
 * Choix du thème de l'espace entreprise.
 *
 * Enregistré dès le clic : le store reçoit la fiche mise à jour, et le layout
 * repose aussitôt l'attribut de thème — l'aperçu, c'est l'espace lui-même.
 * Des radios natives (masquées) portent la sémantique : les flèches du clavier
 * parcourent le groupe sans code dédié.
 */
export function ThemePicker() {
  const { entreprise, update, saving, saveError } = useEntreprise();
  const courant = entreprise.theme ?? DEFAULT_ENTREPRISE_THEME;

  /*
   * Le thème automatique n'est proposé que si une couleur a bien été relevée
   * dans le logo. Sans elle il n'y a rien à calculer — mieux vaut ne pas
   * afficher la tuile que d'en afficher une qui, choisie, ne changerait rien.
   * Cas concret : un logo strictement noir et blanc, ou un compte créé avant
   * que le logo ne devienne obligatoire.
   */
  const apercuAuto = entreprise.themeCouleur
    ? apercuDepuisCouleur({ couleur: entreprise.themeCouleur, accent: entreprise.themeAccent })
    : null;
  // Le thème cliqué, le temps de l'enregistrement : la coche suit la main tout
  // de suite, et revient d'elle-même si l'API refuse.
  const [enCours, setEnCours] = useState<EntrepriseThemeId | null>(null);
  const selection = enCours ?? courant;

  const choisir = async (id: EntrepriseThemeId) => {
    if (id === courant || saving) return;
    setEnCours(id);
    await update({ theme: id });
    setEnCours(null);
  };

  // Le thème calculé passe en tête : c'est celui que le compte porte depuis son
  // inscription, et celui que l'entreprise cherchera à retrouver.
  const tuiles = [
    ...(apercuAuto
      ? [{ id: THEME_AUTO, label: "Vos couleurs", apercu: apercuAuto, auto: true }]
      : []),
    ...ENTREPRISE_THEMES.map((theme) => ({ ...theme, auto: false })),
  ];

  return (
    <Card>
      <CardHeader className="flex-col items-start gap-1">
        <CardTitle id="theme-entreprise-titre">Thème de l&apos;espace</CardTitle>
        <p className="text-sm text-on-surface-variant">
          {apercuAuto
            ? "Votre espace reprend les couleurs de votre logo. Vous pouvez lui préférer une palette prête à l'emploi — le changement est immédiat."
            : "Choisissez les couleurs de votre espace entreprise. Le changement est immédiat."}
        </p>
      </CardHeader>
      <CardBody className="space-y-4">
        {saveError && <ErrorBanner error={saveError} />}
        <div
          role="radiogroup"
          aria-labelledby="theme-entreprise-titre"
          className="grid grid-cols-2 gap-3 sm:grid-cols-3"
        >
          {tuiles.map((theme) => {
            const actif = theme.id === selection;
            return (
              <label
                key={theme.id}
                className={cn(
                  "group relative flex cursor-pointer flex-col gap-3 rounded-xl border-2 p-3 transition-colors",
                  "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-secondary has-[:focus-visible]:ring-offset-2",
                  actif
                    ? "border-primary bg-primary/[0.04]"
                    : "border-outline-variant hover:border-primary hover:bg-surface-container-low",
                  saving && !actif && "cursor-wait opacity-60",
                )}
              >
                <input
                  type="radio"
                  name="theme-entreprise"
                  value={theme.id}
                  checked={actif}
                  disabled={saving && !actif}
                  onChange={() => void choisir(theme.id)}
                  className="sr-only"
                />
                <ThemeApercu {...theme.apercu} />
                <span className="flex items-center justify-between gap-2 text-sm font-semibold text-on-surface">
                  {theme.label}
                  {actif && (
                    <Icon
                      name={enCours ? "progress_activity" : "check_circle"}
                      className={cn("text-[18px] text-primary", enCours && "animate-spin")}
                    />
                  )}
                </span>
                {theme.auto && (
                  <span className="-mt-2 text-xs text-on-surface-variant">D&apos;après votre logo</span>
                )}
              </label>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}

/** Miniature de l'espace : barre latérale, rubrique active, fond de page. */
function ThemeApercu({ primaire, accent, fond }: { primaire: string; accent: string; fond: string }) {
  return (
    <span
      aria-hidden
      className="flex h-16 overflow-hidden rounded-lg border border-outline-variant"
      style={{ backgroundColor: fond }}
    >
      <span className="flex w-1/3 flex-col gap-1.5 bg-white p-2">
        <span className="h-1.5 w-full rounded-full" style={{ backgroundColor: accent }} />
        <span className="h-1.5 w-3/4 rounded-full bg-black/10" />
        <span className="h-1.5 w-2/3 rounded-full bg-black/10" />
      </span>
      <span className="flex flex-1 flex-col gap-1.5 p-2">
        <span className="h-2 w-2/3 rounded-full" style={{ backgroundColor: primaire }} />
        <span className="mt-auto h-4 w-1/2 rounded-md" style={{ backgroundColor: primaire }} />
      </span>
    </span>
  );
}
