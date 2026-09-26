/**
 * Mouvements Framer Motion du module — définis une fois.
 *
 * La cloche et la page avaient chacune leur copie du glissement de filtre, à
 * quelques pixels près : deux gestes identiques qui ne bougeaient pas pareil.
 */
import type { Transition, Variants } from "framer-motion";
import type { Sens } from "./types";

/** Amplitude du glissement de filtre : on devine le sens, sans traversée. */
const DECALAGE = 22;

/** Changement de filtre : l'ancien contenu part d'un côté, le nouveau arrive de l'autre. */
export const GLISSEMENT: Variants = {
  entree: (sens: Sens) => ({ opacity: 0, x: DECALAGE * sens }),
  present: { opacity: 1, x: 0 },
  sortie: (sens: Sens) => ({ opacity: 0, x: -DECALAGE * sens }),
};

/** Conteneur de liste : il ne bouge pas lui-même, il ORCHESTRE ses enfants. */
export const CASCADE: Variants = {
  cache: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.03 } },
};

/** Un groupe de la liste : monte de quelques pixels en apparaissant. */
export const APPARITION: Variants = {
  cache: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.26, ease: [0.4, 0, 0.2, 1] } },
};

/** Rebond d'un compteur qui change de valeur. */
export const REBOND: Transition = { type: "spring", stiffness: 500, damping: 20 };

/** Transition nulle — la préférence « mouvement réduit ». */
export const IMMOBILE: Transition = { duration: 0 };
