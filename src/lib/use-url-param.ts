"use client";

/**
 * Lecture et écriture d'un paramètre de l'URL.
 *
 * Un état de recherche qui ne vit que dans `useState` a trois défauts que rien
 * ne rattrape ensuite :
 *  • le résultat n'est ni partageable ni marquable — l'URL ne dit rien de ce
 *    qui est affiché ;
 *  • le retour arrière du navigateur quitte la page au lieu de revenir à la
 *    recherche précédente ;
 *  • un autre composant — la barre du haut — ne peut pas la modifier.
 *
 * L'URL devient donc la source de vérité, et ce module la manipule sans jamais
 * écraser les autres paramètres présents.
 */
import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export interface EcritureOptions {
  /**
   * `true` pour empiler une entrée d'historique.
   *
   * Réservé aux gestes DÉLIBÉRÉS — valider une recherche, changer de filtre.
   * Une frappe au clavier doit remplacer l'entrée courante : sans cela, revenir
   * en arrière rejoue la saisie lettre par lettre.
   */
  push?: boolean;
}

export type EcrireParams = (
  valeurs: Record<string, string | undefined>,
  options?: EcritureOptions,
) => void;

/**
 * @returns l'écrivain de paramètres, stable d'un rendu à l'autre.
 *
 * Une valeur vide ou `undefined` RETIRE le paramètre : une URL ne doit pas
 * traîner un `?q=` vide, qui se partage et se marque comme un état.
 */
export function useEcrireParams(): EcrireParams {
  const router = useRouter();
  const chemin = usePathname();
  const parametres = useSearchParams();

  return useCallback(
    (valeurs, options) => {
      const suivants = new URLSearchParams(parametres.toString());

      for (const [cle, valeur] of Object.entries(valeurs)) {
        const propre = valeur?.trim();
        if (propre) suivants.set(cle, propre);
        else suivants.delete(cle);
      }

      const requete = suivants.toString();
      const url = requete ? `${chemin}?${requete}` : chemin;

      /*
       * `scroll: false` : la recherche se raffine en place. Remonter en haut à
       * chaque frappe ferait sauter la page sous les doigts.
       */
      if (options?.push) router.push(url, { scroll: false });
      else router.replace(url, { scroll: false });
    },
    [router, chemin, parametres],
  );
}

/** Valeur d'un paramètre, `""` s'il est absent. */
export function useParam(cle: string): string {
  return useSearchParams().get(cle) ?? "";
}
