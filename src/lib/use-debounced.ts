"use client";

/**
 * Valeur RETARDÉE : ne change qu'après un temps de calme.
 *
 * Sept écrans en tenaient chacun leur copie — trois pages d'administration, la
 * recherche de talents, le catalogue de formations, la recherche d'offres et la
 * recherche globale. Toutes faisaient la même chose, avec le même délai écrit
 * sept fois.
 *
 * À quoi ça sert : une liste filtrée par un champ de saisie ne doit pas
 * interroger le serveur à chaque frappe. « développeur » lancerait onze
 * requêtes, dont les réponses reviendraient dans le désordre, et l'on verrait
 * la liste se recomposer à chaque lettre.
 *
 * Ce que le hook ne fait PAS, volontairement :
 *  • il ne « vide » pas plus vite qu'il ne remplit — effacer le champ attend le
 *    même délai. Traiter le vide à part rendrait le comportement imprévisible,
 *    et le hook ne sait pas ce que « vide » veut dire pour un `T` quelconque ;
 *  • il n'expose ni `flush` ni `cancel`. Aucun appelant n'en a besoin, et une
 *    API qu'on n'utilise pas est une API qu'on ne teste pas.
 *
 * @example
 * const [saisie, setSaisie] = useState("");
 * // Le `.trim()` AVANT le retard : « react » et « react   » ne doivent pas
 * // compter pour deux recherches.
 * const q = useDebounced(saisie.trim(), DELAI_RECHERCHE_MS);
 * const { data } = useApi(() => api.offres.list({ q }), [q]);
 */
import { useEffect, useState } from "react";

/**
 * Délai des champs qui FILTRENT une liste déjà à l'écran.
 *
 * 350 ms : au-delà, la liste paraît en retard sur la frappe ; en deçà, une
 * saisie normale déclenche plusieurs requêtes par mot. Le résultat précédent
 * reste visible pendant ce temps, ce qui rend l'attente indolore.
 */
export const DELAI_RECHERCHE_MS = 350;

/**
 * Délai des SUGGESTIONS, plus court.
 *
 * Une liste de propositions n'a rien à montrer tant qu'elle n'a pas répondu :
 * l'attente s'y voit, là où un filtrage laisse la liste précédente en place.
 * Les deux valeurs vivent ici pour rester comparables — dispersées dans les
 * écrans, elles avaient déjà divergé.
 */
export const DELAI_SUGGESTIONS_MS = 250;

export function useDebounced<T>(valeur: T, delaiMs: number = DELAI_RECHERCHE_MS): T {
  /*
   * Initialisé AVEC la valeur, et non à vide : un écran ouvert sur une
   * recherche déjà remplie — un lien partagé, un retour arrière — afficherait
   * sinon la liste entière pendant le délai, avant de se corriger.
   */
  const [stabilisee, setStabilisee] = useState(valeur);

  useEffect(() => {
    // Le nettoyage annule le minuteur précédent : c'est LUI qui fait le
    // retard. Sans lui, chaque frappe programmerait sa propre échéance et
    // toutes finiraient par tomber.
    const minuteur = setTimeout(() => setStabilisee(valeur), delaiMs);
    return () => clearTimeout(minuteur);
  }, [valeur, delaiMs]);

  return stabilisee;
}
