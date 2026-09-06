/**
 * Ordre d'empilement des couches flottantes.
 *
 * Ces valeurs ne sont utiles QUE les unes par rapport aux autres : ce qui
 * compte n'est pas « 100 », c'est que la modale passe au-dessus de l'en-tête et
 * en dessous du menu d'un `Select`. Tant qu'elles étaient écrites en dur dans
 * chaque composant, cette relation ne vivait que dans un commentaire — et un
 * commentaire ne casse pas le jour où quelqu'un ajuste un `z-index` ailleurs.
 *
 * Réservé aux couches portées par `document.body` (portails). Les empilements
 * LOCAUX — un menu déroulant dans son en-tête, une puce sur une icône — restent
 * sur l'échelle Tailwind (`z-10`, `z-30`…) : ils sont pris dans le contexte
 * d'empilement de leur parent et ne rencontreront jamais ceux-ci.
 */
export const Z_LAYERS = {
  /** Barre d'action fixée en bas d'un formulaire long. */
  stickyBar: 30,
  /** En-tête d'application, collé en haut. */
  header: 50,
  /** Boîte de dialogue et son voile. */
  modal: 100,
  /**
   * Menu d'un `Select`.
   *
   * Porté par `body` comme les modales, donc plus rogné par elles — mais aussi
   * plus protégé par leur contexte d'empilement : il DOIT passer au-dessus,
   * sans quoi une liste ouverte depuis une modale s'affiche derrière son voile,
   * donc invisible.
   */
  selectMenu: 110,
  /**
   * Confettis.
   *
   * Au-dessus de tout : la salve accompagne un écran de réussite qui peut lui
   * même être une modale. Le canvas est `pointer-events: none`, il ne prend
   * donc jamais un clic à l'interface qu'il recouvre.
   */
  confetti: 120,
} as const;
