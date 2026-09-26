"use client";

import { useCallback, useState } from "react";
import type { FiltreLecture, Sens } from "../types";

/** Ordre des filtres à l'écran — c'est lui qui donne le sens du glissement. */
const ORDRE: readonly FiltreLecture[] = ["toutes", "non-lues"];

export interface EtatFiltreLecture {
  filtre: FiltreLecture;
  /** Sens du dernier changement : le contenu arrive du côté du filtre choisi. */
  sens: Sens;
  changer: (suivant: FiltreLecture) => void;
}

/**
 * Filtre « Toutes / Non lues » et sens de son dernier changement.
 *
 * Le sens est mémorisé AVEC le filtre : l'animation doit savoir d'où vient
 * l'utilisateur, pas seulement où il va.
 */
export function useFiltreLecture(initial: FiltreLecture = "toutes"): EtatFiltreLecture {
  const [etat, setEtat] = useState<{ filtre: FiltreLecture; sens: Sens }>({
    filtre: initial,
    sens: 1,
  });

  const changer = useCallback((suivant: FiltreLecture) => {
    setEtat((avant) =>
      avant.filtre === suivant
        ? avant
        : {
            filtre: suivant,
            sens: ORDRE.indexOf(suivant) > ORDRE.indexOf(avant.filtre) ? 1 : -1,
          },
    );
  }, []);

  return { filtre: etat.filtre, sens: etat.sens, changer };
}
