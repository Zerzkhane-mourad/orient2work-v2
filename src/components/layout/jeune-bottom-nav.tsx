"use client";

/**
 * Barre d'onglets du bas — mobile uniquement.
 *
 * Remplace le menu « hamburger », qui coûtait deux gestes pour chaque
 * déplacement : ouvrir, puis choisir dans une liste qui repoussait la page. Ici
 * les quatre destinations quotidiennes sont visibles en permanence, à une
 * distance du pouce, et l'onglet courant se lit sans ouvrir quoi que ce soit.
 *
 * Cinq cibles au maximum, `min-h-14` chacune : en dessous, la précision du
 * pouce ne suffit plus et l'on ouvre l'onglet voisin.
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AnimatePresence,
  motion,
  useDragControls,
  useReducedMotion,
  type PanInfo,
} from "framer-motion";
import { Icon } from "@/components/ui";
import {
  COURBE_SORTIE,
  DUREE_FEUILLE,
  DUREE_PANNEAU,
  DUREE_VOILE,
  useTransitionUI,
} from "@/components/motion/transitions";
import { LogoutButton } from "@/features/auth/logout-button";
import { cn } from "@/lib/utils";
import {
  estActif,
  estImmersif,
  NAV_COMPTE,
  NAV_ONGLETS_MOBILE,
  NAV_PLUS_RECHERCHE,
  type Destination,
} from "./jeune-nav";

/**
 * @param unread Nombre de notifications non lues, pour la pastille.
 *
 *   Passé par la coquille plutôt que relu ici : `useNotifications` déclenche un
 *   appel réseau, et l'appeler une seconde fois dans cette barre en doublerait
 *   la fréquence pour afficher le même nombre.
 */
export function JeuneBottomNav({ unread = 0 }: { unread?: number }) {
  const chemin = usePathname();
  const [plusOuvert, setPlusOuvert] = useState(false);

  // Le trait d'onglet parcourt au plus la largeur de l'écran : la durée d'un
  // petit menu suffit, celle de la feuille le ferait traîner derrière le doigt.
  const transitionOnglet = useTransitionUI(DUREE_VOILE);

  // La feuille se referme au changement de page : sans cela, elle resterait
  // ouverte par-dessus la destination que l'on vient d'atteindre.
  useEffect(() => {
    setPlusOuvert(false);
  }, [chemin]);

  /*
   * Corps figé pendant l'ouverture : sous iOS, un panneau superposé laisse la
   * page défiler derrière lui, et l'on retrouve un écran déplacé en refermant.
   */
  useEffect(() => {
    if (!plusOuvert) return;
    const precedent = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = precedent;
    };
  }, [plusOuvert]);

  /*
   * Échap referme la feuille.
   *
   * C'est ce que fait un `<dialog>` nativement, et ce que cette feuille faisait
   * perdre en étant dessinée à la main : au clavier, elle ne se fermait que si
   * l'on retrouvait le voile — un bouton sans libellé visible.
   */
  useEffect(() => {
    if (!plusOuvert) return;
    const auClavier = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPlusOuvert(false);
    };
    document.addEventListener("keydown", auClavier);
    return () => document.removeEventListener("keydown", auClavier);
  }, [plusOuvert]);

  // « Plus » s'allume aussi quand la page courante s'y trouve : l'utilisateur
  // doit voir OÙ il est, même si la destination n'a pas son propre onglet.
  const ailleurs = [...NAV_PLUS_RECHERCHE, ...NAV_COMPTE].some((d) => estActif(d.href, chemin));

  // Après les hooks : leur ordre doit rester le même d'un rendu à l'autre.
  if (estImmersif(chemin)) return null;

  return (
    <>
      {/*
        `AnimatePresence` retient la feuille le temps de sa sortie.

        Sans lui, `plusOuvert` repassé à faux la retire du DOM à l'image
        suivante : elle disparaissait d'un coup, alors même que son ouverture
        avait été animée — le retour paraissait cassé, pas rapide.
      */}
      <AnimatePresence>
        {plusOuvert && (
          <FeuillePlus
            key="feuille-plus"
            chemin={chemin}
            onClose={() => setPlusOuvert(false)}
          />
        )}
      </AnimatePresence>

      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-outline-variant bg-surface-container-lowest pb-safe sm:hidden"
      >
        <div className="flex items-stretch">
          {NAV_ONGLETS_MOBILE.map((item) => {
            const actif = estActif(item.href, chemin);
            const alertes = item.href.endsWith("/notifications") ? unread : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={actif ? "page" : undefined}
                aria-label={
                  alertes > 0 ? `${item.label}, ${alertes} non lues` : undefined
                }
                className={cn(
                  "relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-semibold transition-colors",
                  actif ? "text-primary" : "text-on-surface-variant",
                )}
              >
                {/* Trait supérieur plutôt qu'un fond : il marque l'onglet sans
                    élargir la cible ni assombrir l'icône.

                    `layoutId` partagé avec le trait de « Plus » : il ne
                    réapparaît pas ailleurs, il GLISSE jusqu'à l'onglet atteint.
                    Les deux ne sont jamais allumés en même temps — « Plus »
                    ne s'allume que pour les destinations sans onglet. */}
                {actif && (
                  <motion.span
                    layoutId="onglet-actif-mobile"
                    transition={transitionOnglet}
                    className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-secondary"
                  />
                )}
                <span className="relative">
                  <Icon name={item.icon} filled={actif} className="text-2xl" />
                  {alertes > 0 && (
                    /*
                     * Pastille chiffrée, posée sur l'icône. Le nombre est
                     * VOLONTAIREMENT redondant avec `aria-label` : un lecteur
                     * d'écran ne lira pas ce `span` décoratif au milieu du
                     * libellé de l'onglet.
                     */
                    <span
                      aria-hidden
                      className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold leading-none text-on-error"
                    >
                      {alertes > 9 ? "9+" : alertes}
                    </span>
                  )}
                </span>
                <span className="truncate">{item.court ?? item.label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setPlusOuvert(true)}
            aria-expanded={plusOuvert}
            aria-haspopup="dialog"
            className={cn(
              "relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-semibold transition-colors",
              ailleurs ? "text-primary" : "text-on-surface-variant",
            )}
          >
            {ailleurs && (
              <motion.span
                layoutId="onglet-actif-mobile"
                transition={transitionOnglet}
                className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-secondary"
              />
            )}
            {/* L'icône bascule vers la croix quand la feuille est ouverte : le
                bouton dit alors ce qu'un second appui ferait. La rotation lie
                les deux états — sans elle, c'est un clignotement. */}
            <motion.span
              animate={{ rotate: plusOuvert ? 90 : 0 }}
              transition={transitionOnglet}
              className="block"
            >
              <Icon name={plusOuvert ? "close" : "menu"} className="block text-2xl" />
            </motion.span>
            <span>Plus</span>
          </button>
        </div>
      </nav>
    </>
  );
}

/** Course, en pixels, au-delà de laquelle relâcher la poignée referme. */
const SEUIL_FERMETURE_PX = 96;

/** Vitesse de rejet — un geste bref et vif referme sans atteindre le seuil. */
const SEUIL_VITESSE = 550;

/**
 * Feuille du bas — le reste des destinations.
 *
 * Ancrée en BAS et non au centre : elle s'ouvre là où le pouce vient de
 * toucher, et les entrées restent dans la moitié atteignable de l'écran.
 *
 * ── Le mouvement ────────────────────────────────────────────────────────────
 *
 * Elle MONTE depuis le bord inférieur, d'où le doigt vient de partir, et
 * redescend par le même chemin. Une feuille qui se pose sans trajet ne dit pas
 * d'où elle vient, ni par où la renvoyer.
 *
 * Le voile se fond séparément : lié à la feuille, il aurait glissé avec elle et
 * découvert la page par le bas, comme un store qu'on relève.
 *
 * ── Le glissé ───────────────────────────────────────────────────────────────
 *
 * La poignée n'était qu'un dessin : elle annonçait un panneau qu'on referme en
 * le repoussant, sans que le geste fasse quoi que ce soit. Elle le fait
 * maintenant — et elle SEULE (`dragListener={false}` + `dragControls`). Poser
 * le glissé sur la feuille entière lui ferait confisquer le défilement de sa
 * propre liste : sur un écran court, les destinations du bas deviendraient
 * inatteignables.
 */
function FeuillePlus({ chemin, onClose }: { chemin: string; onClose: () => void }) {
  const poignee = useDragControls();
  const reduire = useReducedMotion();
  const feuille = useRef<HTMLDivElement>(null);

  /*
   * Le focus entre dans la feuille, et revient d'où il venait.
   *
   * `aria-modal` annonce aux lecteurs d'écran que le reste de la page ne
   * compte plus. Sans ce déplacement, l'annonce serait un mensonge : le focus
   * resterait sur le bouton « Plus », hors de la feuille, et la première
   * tabulation partirait explorer une page déclarée inerte.
   *
   * Le retour se fait au démontage, donc APRÈS l'animation de sortie — le
   * bouton reprend le focus une fois la feuille effectivement partie.
   */
  useEffect(() => {
    const precedent = document.activeElement as HTMLElement | null;
    feuille.current?.focus();
    return () => precedent?.focus?.();
  }, []);

  const transitionEntree = useTransitionUI(DUREE_FEUILLE);
  const transitionSortie = useTransitionUI(DUREE_PANNEAU, COURBE_SORTIE);
  const transitionVoile = useTransitionUI(DUREE_VOILE);

  const auRelacher = (_: unknown, info: PanInfo) => {
    if (info.offset.y > SEUIL_FERMETURE_PX || info.velocity.y > SEUIL_VITESSE) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 sm:hidden">
      <motion.button
        type="button"
        aria-label="Fermer le menu"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={transitionVoile}
        className="absolute inset-0 bg-primary/50 backdrop-blur-sm"
      />

      <motion.div
        ref={feuille}
        role="dialog"
        aria-modal="true"
        aria-label="Plus de destinations"
        /* `-1` : la feuille se laisse focaliser à l'ouverture sans pour autant
           s'insérer dans le parcours de tabulation. */
        tabIndex={-1}
        initial={{ y: "100%" }}
        animate={{ y: 0, transition: transitionEntree }}
        /* Sortie plus courte et accélérée : la feuille libère l'écran sans le
           retenir. La même courbe dans les deux sens ferait traîner le retour. */
        exit={{ y: "100%", transition: transitionSortie }}
        drag={reduire ? false : "y"}
        dragListener={false}
        dragControls={poignee}
        /* Bornes nulles + élasticité vers le bas UNIQUEMENT : la feuille se
           laisse repousser, jamais tirer au-delà du haut de l'écran. */
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.5 }}
        onDragEnd={auRelacher}
        className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto overscroll-contain rounded-t-xl border-t border-outline-variant bg-surface-container-lowest pb-safe"
      >
        {/* Poignée : dit que le panneau se referme, avant même de chercher où.
            `touch-none` empêche le navigateur de traiter le geste comme un
            défilement — sans lui, le glissé ne démarre qu'une fois sur deux. */}
        <div
          onPointerDown={(e) => poignee.start(e)}
          className="flex touch-none cursor-grab justify-center py-3 active:cursor-grabbing"
        >
          <span className="h-1 w-10 rounded-full bg-outline-variant" />
        </div>

        <GroupeFeuille titre="Ma recherche" destinations={NAV_PLUS_RECHERCHE} chemin={chemin} />
        <GroupeFeuille titre="Mon compte" destinations={NAV_COMPTE} chemin={chemin} />

        <div className="border-t border-outline-variant">
          <LogoutButton className="flex w-full min-h-14 items-center gap-3 px-4 text-sm font-semibold text-on-surface-variant" />
        </div>
      </motion.div>
    </div>
  );
}

function GroupeFeuille({
  titre,
  destinations,
  chemin,
}: {
  titre: string;
  destinations: readonly Destination[];
  chemin: string;
}) {
  return (
    <div className="border-t border-outline-variant py-1 first:border-t-0">
      <p className="px-4 pb-1 pt-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
        {titre}
      </p>
      {destinations.map((item) => {
        const actif = estActif(item.href, chemin);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={actif ? "page" : undefined}
            className={cn(
              "flex min-h-14 items-center gap-3 px-4 text-sm font-semibold",
              actif ? "text-primary" : "text-on-surface",
            )}
          >
            <Icon name={item.icon} filled={actif} className="text-[22px]" />
            {item.label}
            {actif && <Icon name="check" className="ml-auto text-[18px] text-secondary" />}
          </Link>
        );
      })}
    </div>
  );
}
