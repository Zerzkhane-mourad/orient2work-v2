"use client";

/**
 * « La page est-elle défilée ? »
 *
 * Deux usages, une seule mesure : l'en-tête collant gagne son ombre dès que du
 * contenu passe dessous, et le bouton de retour en haut n'apparaît qu'une fois
 * qu'il sert à quelque chose.
 *
 * Le calcul est reporté à la prochaine image (`requestAnimationFrame`) : un
 * `scroll` se déclenche des dizaines de fois par seconde, et lire `scrollY` puis
 * poser un état à chaque événement ferait travailler React pendant tout le
 * geste. Ici, une image = une mesure au plus.
 */
import { useEffect, useState } from "react";

export function useDefilement(seuilPx: number): boolean {
  /*
   * `false` au premier rendu, y compris côté serveur, où `window` n'existe pas :
   * l'effet corrige aussitôt si la page est rouverte à mi-hauteur — cas d'une
   * restauration de position par le navigateur.
   */
  const [depasse, setDepasse] = useState(false);

  useEffect(() => {
    let image = 0;

    const mesurer = () => {
      // Une image déjà réservée suffit : en programmer une par événement
      // reviendrait à ne rien avoir limité du tout.
      if (image) return;
      image = requestAnimationFrame(() => {
        image = 0;
        setDepasse(window.scrollY > seuilPx);
      });
    };

    mesurer();
    window.addEventListener("scroll", mesurer, { passive: true });
    // La hauteur de la page change sans défilement — un panneau qui se déplie,
    // une liste qui charge : le bouton doit disparaître si le défilement a été
    // ramené à zéro par ce changement.
    window.addEventListener("resize", mesurer, { passive: true });

    return () => {
      window.removeEventListener("scroll", mesurer);
      window.removeEventListener("resize", mesurer);
      cancelAnimationFrame(image);
    };
  }, [seuilPx]);

  return depasse;
}
