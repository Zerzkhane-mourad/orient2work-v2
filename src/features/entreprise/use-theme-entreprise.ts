"use client";

import { useEffect } from "react";
import type { ApiEntreprise } from "@/lib/api/types";
import { paletteDepuisCouleur } from "./theme-from-color";
import { DEFAULT_ENTREPRISE_THEME, THEME_ATTRIBUTE, THEME_AUTO } from "./themes";

/**
 * Applique la palette de l'espace entreprise sur `<html>`.
 *
 * Deux mécanismes, un seul résultat :
 *  • un PRÉRÉGLAGE pose `data-theme-entreprise`, et la règle correspondante de
 *    `globals.css` redéfinit les jetons ;
 *  • le thème AUTO n'a pas de règle CSS possible — sa palette dépend du logo —
 *    et pose donc les jetons en propriétés en ligne, qui l'emportent sur la
 *    feuille de style à égalité de spécificité.
 *
 * Les deux sont exclusifs : basculer de l'un à l'autre doit défaire le premier,
 * sans quoi un attribut oublié reteinterait la palette calculée. D'où le ménage
 * systématique en tête d'effet plutôt qu'en branche « sinon ».
 *
 * Sur `<html>` et non sur la coquille de l'espace : les modales et les menus
 * rendus en portail dans `document.body` suivent ainsi le thème.
 */
export function useThemeEntreprise(entreprise: ApiEntreprise): void {
  const { theme, themeCouleur, themeAccent } = entreprise;

  useEffect(() => {
    const root = document.documentElement;

    const palette =
      theme === THEME_AUTO && themeCouleur
        ? paletteDepuisCouleur({ couleur: themeCouleur, accent: themeAccent })
        : null;

    const retirer = () => {
      root.removeAttribute(THEME_ATTRIBUTE);
      // `removeProperty` sur une propriété absente ne coûte rien et ne lève pas :
      // la liste des jetons à effacer est donc celle qu'on vient de poser, ou
      // rien du tout si le thème n'était pas calculé.
      if (palette) {
        for (const jeton of Object.keys(palette)) root.style.removeProperty(jeton);
      }
    };

    retirer();

    if (palette) {
      for (const [jeton, valeur] of Object.entries(palette)) {
        root.style.setProperty(jeton, valeur);
      }
    } else if (theme && theme !== THEME_AUTO && theme !== DEFAULT_ENTREPRISE_THEME) {
      root.setAttribute(THEME_ATTRIBUTE, theme);
    }

    // En quittant l'espace, le site public et les autres espaces retrouvent la
    // palette de base.
    return retirer;
  }, [theme, themeCouleur, themeAccent]);
}
