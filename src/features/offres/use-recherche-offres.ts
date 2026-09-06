"use client";

/**
 * État de la recherche d'offres, ancré dans l'URL.
 *
 * Le champ de saisie garde son propre état — il doit répondre à la frappe sans
 * attendre un aller-retour de routeur — mais l'URL reste seule à décider de ce
 * qui est INTERROGÉ. C'est ce qui permet à la barre de recherche de l'en-tête,
 * au retour arrière du navigateur et à un lien partagé de piloter la même page.
 *
 * La conciliation des deux tient en deux effets, qui convergent toujours :
 *  • l'URL a changé sans nous — on adopte sa valeur ;
 *  • la saisie s'est arrêtée — on la publie dans l'URL.
 * Une fois d'accord, chacun des deux ne fait plus rien.
 */
import { useCallback, useEffect, useState } from "react";
import { useDebounced } from "@/lib/use-debounced";
import { useEcrireParams, useParam } from "@/lib/use-url-param";

export const TYPE_TOUS = "Tous";

export interface RechercheOffres {
  /** Valeur du champ — suit la frappe, sans délai. */
  terme: string;
  setTerme: (valeur: string) => void;
  /** Ce qui est réellement interrogé : l'URL, donc après la pause de frappe. */
  termeApplique: string;
  type: string;
  setType: (valeur: string) => void;
}

export function useRechercheOffres(): RechercheOffres {
  const ecrire = useEcrireParams();
  const termeUrl = useParam("q");
  const typeUrl = useParam("type") || TYPE_TOUS;

  const [terme, setTerme] = useState(termeUrl);

  /*
   * L'URL a bougé sans passer par ce champ — barre du haut, retour arrière,
   * lien ouvert. On adopte, SAUF si le champ dit déjà la même chose : sans ce
   * garde-fou, une saisie « react » suivie d'un espace serait ramenée à
   * « react » et le curseur reculerait d'un caractère.
   */
  useEffect(() => {
    setTerme((actuel) => (actuel.trim() === termeUrl ? actuel : termeUrl));
  }, [termeUrl]);

  /*
   * La saisie se publie une fois stabilisée. `replace` et non `push` : empiler
   * une entrée par frappe ferait rejouer la recherche lettre par lettre au
   * retour arrière.
   *
   * Le retard porte sur la VALEUR, pas sur l'écriture : c'est `stabilise` qui
   * réveille l'effet, lequel se contente alors de comparer et d'écrire.
   */
  const stabilise = useDebounced(terme.trim());

  useEffect(() => {
    if (stabilise !== termeUrl) ecrire({ q: stabilise });
  }, [stabilise, termeUrl, ecrire]);

  const setType = useCallback(
    (valeur: string) => {
      // Choisir un filtre est un geste délibéré : il mérite son entrée
      // d'historique, pour que le retour arrière le défasse.
      ecrire({ type: valeur === TYPE_TOUS ? undefined : valeur }, { push: true });
    },
    [ecrire],
  );

  return { terme, setTerme, termeApplique: termeUrl, type: typeUrl, setType };
}
