"use client";

import { useEffect } from "react";

/**
 * Appelle `rafraichir` à intervalle régulier TANT QUE l'onglet est visible, et
 * au retour sur l'onglet.
 *
 * Un onglet en arrière-plan n'interroge pas le serveur pour rien ; revenir
 * dessus montre aussitôt ce qui est arrivé entre-temps.
 */
export function useRafraichissementVisible(rafraichir: () => void, intervalleMs: number): void {
  useEffect(() => {
    const siVisible = () => {
      if (document.visibilityState === "visible") rafraichir();
    };
    const minuteur = setInterval(siVisible, intervalleMs);
    document.addEventListener("visibilitychange", siVisible);
    return () => {
      clearInterval(minuteur);
      document.removeEventListener("visibilitychange", siVisible);
    };
  }, [rafraichir, intervalleMs]);
}
