/**
 * Salve de confettis, réservée aux réussites qui se méritent.
 *
 * Volontairement rare : un test de validation réussi, une formation certifiée.
 * Employée à chaque enregistrement, l'animation cesserait de signifier quoi que
 * ce soit et deviendrait une gêne.
 */
import { Z_LAYERS } from "./z-layers";

/** Durée totale de la salve. Au-delà, l'effet lasse au lieu de récompenser. */
const DUREE_MS = 1400;

/**
 * Couleurs lues dans les tokens plutôt que codées en dur.
 *
 * Les confettis reprennent ainsi l'or et le bleu de la charte, et suivront un
 * changement de palette sans qu'on ait à y penser. `getComputedStyle` résout la
 * variable CSS en couleur réelle, ce que `canvas-confetti` attend.
 */
function couleursCharte(): string[] {
  const styles = getComputedStyle(document.documentElement);
  const tokens = [
    "--color-secondary-container",
    "--color-secondary-fixed-dim",
    "--color-primary-fixed-dim",
    "--color-success",
  ];

  const couleurs = tokens.map((token) => styles.getPropertyValue(token).trim()).filter(Boolean);
  // Repli si les variables ne sont pas encore appliquées (rendu très précoce).
  return couleurs.length > 0 ? couleurs : ["#fed65b", "#b5c7ea", "#2e7d55"];
}

export async function celebrate(): Promise<void> {
  if (typeof window === "undefined") return;

  /*
   * `prefers-reduced-motion` : réglage système, pas une préférence esthétique.
   * Des dizaines de particules en mouvement sont exactement ce qui déclenche
   * une gêne vestibulaire — la réussite reste annoncée par le texte et le score.
   *
   * Contrôlé AVANT l'import : qui a désactivé les animations ne télécharge
   * jamais la bibliothèque.
   */
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  /*
   * Chargée à la demande, et non avec l'écran.
   *
   * La bibliothèque ne sert qu'au moment précis d'une réussite : l'inclure dans
   * le bundle de la page ferait payer ~7 ko à tous ceux qui passent le test,
   * réussite ou non. Le délai d'un `import()` est sans conséquence pour une
   * animation de félicitations.
   */
  const { default: confetti } = await import("canvas-confetti");

  const colors = couleursCharte();
  const commun = {
    colors,
    zIndex: Z_LAYERS.confetti,
    // Le canvas ne doit jamais intercepter un clic sur le bouton en dessous.
    disableForReducedMotion: true,
    scalar: 0.9,
  } as const;

  // Deux salves latérales plutôt qu'une explosion centrale : le centre de
  // l'écran porte le score, on ne le recouvre pas.
  confetti({ ...commun, particleCount: 45, spread: 60, angle: 60, origin: { x: 0, y: 0.75 } });
  confetti({ ...commun, particleCount: 45, spread: 60, angle: 120, origin: { x: 1, y: 0.75 } });

  const relance = window.setTimeout(() => {
    confetti({ ...commun, particleCount: 30, spread: 90, angle: 75, origin: { x: 0.1, y: 0.8 } });
    confetti({ ...commun, particleCount: 30, spread: 90, angle: 105, origin: { x: 0.9, y: 0.8 } });
  }, DUREE_MS / 3);

  // Rendu à l'appelant pour qu'un démontage précoce n'allume pas une salve
  // orpheline sur l'écran suivant.
  window.setTimeout(() => window.clearTimeout(relance), DUREE_MS);
}
