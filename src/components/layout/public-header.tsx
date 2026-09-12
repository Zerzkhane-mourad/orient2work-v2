"use client";

/**
 * En-tête du site public.
 *
 * ── La structure, reprise de la référence fournie ───────────────────────────
 *
 * Trois zones, et non deux : le logo à gauche, les liens AU CENTRE dans une
 * capsule blanche posée sur le fond, les actions à droite.
 *
 *  • La capsule est ce qui change tout. Une rangée de liens nus se confond avec
 *    le reste de la page ; enfermés dans une pastille claire qui porte une
 *    ombre, ils deviennent un objet à part, et la navigation cesse de flotter.
 *  • Le centrage est confié à une GRILLE `1fr auto 1fr`, pas à un
 *    `justify-between`. Avec ce dernier, la position des liens dépendrait de la
 *    largeur du logo et des boutons : elle bougerait entre « Connexion » et
 *    « Mon espace ». La colonne centrale, elle, est centrée quoi qu'il arrive.
 *  • Le trait de séparation en bas de l'en-tête disparaît. Dans la référence
 *    la barre ne se distingue pas du fond — c'est la capsule qui porte le
 *    relief. Un filet horizontal en travers de la page rendrait ce relief
 *    contradictoire.
 *
 * ── Pas de fond : l'en-tête se fond dans le héros ───────────────────────────
 *
 * La barre n'a plus de fond propre. Les héros remontent SOUS elle (`-mt-20` sur
 * leur section, 80 px ajoutés à leur retrait haut), si bien que leur couleur
 * court jusqu'au bord de la fenêtre et que la barre se lit comme la première
 * ligne du héros, et non comme un bandeau posé au-dessus.
 *
 * Deux conséquences :
 *
 *  1. Sur un héros SOMBRE (accueil, entreprises — marqués `data-heros-sombre`),
 *     le texte passe en clair et la capsule devient une vitre (classes
 *     `entete-*`, voir `globals.css`). Une capsule blanche pleine y aurait été le
 *     point le plus lumineux de l'écran, au-dessus du titre qu'elle devait
 *     laisser dominer.
 *  2. Le fond REVIENT une fois le héros quitté : sans lui, le logo et
 *     « Connexion » se poseraient à même le texte qui défile dessous. Il ne
 *     revient pas avant — le temps de traverser le héros, la barre reste fondue
 *     dedans.
 *
 * Les couleurs ne changent pas ailleurs : la page active passe en or, et les
 * boutons étaient DÉJÀ des pastilles (`rounded-full` dans `Button`) — c'est le
 * reste qui s'aligne sur eux.
 *
 * ── Ce qui est corrigé au passage ───────────────────────────────────────────
 *
 * `aria-current="page"` manquait. La page courante n'était signalée que par sa
 * couleur : invisible pour un lecteur d'écran, et invisible tout court pour qui
 * ne distingue pas l'or du gris.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Logo } from "./logo";
import { Icon, ButtonLink } from "@/components/ui";
import { COURBE_SORTIE, DUREE_MENU, useTransitionUI } from "@/components/motion/transitions";
import { useSession } from "@/features/auth/session-provider";
import { HOME_BY_ROLE } from "@/lib/config";
import { publicNav } from "@/lib/navigation";
import { useDefilement } from "@/lib/use-defilement";
import { cn } from "@/lib/utils";

/**
 * L'en-tête est-il encore posé sur le héros sombre de la page ?
 *
 * `undefined` tant que rien n'est mesuré — rendu serveur et premier rendu
 * client. L'attribut `data-sur-heros` est alors absent, et c'est le CSS seul
 * (`html:has([data-heros-sombre])`) qui choisit le ton : juste dès le premier
 * affichage, sans attendre le script.
 *
 * `IntersectionObserver` et non un calcul au défilement : `ScrollSmoother`
 * translate le contenu avec un temps de retard sur la position native. Les
 * évènements `scroll` cessent quand le doigt s'arrête, alors que le contenu
 * glisse encore près d'une seconde ; l'observateur, lui, suit la position
 * VISIBLE, image par image.
 *
 * La bande observée est le dixième haut de la fenêtre — la hauteur de la barre,
 * à peu de chose près, sur tous les écrans.
 */
function useSurHerosSombre(pathname: string): "oui" | "non" | undefined {
  const [etat, setEtat] = useState<"oui" | "non" | undefined>(undefined);

  useEffect(() => {
    // Relu à chaque changement de page : l'en-tête persiste d'une page publique
    // à l'autre, pas le héros.
    const heros = document.querySelector("[data-heros-sombre]");
    if (!heros) {
      setEtat("non");
      return;
    }

    const observateur = new IntersectionObserver(
      ([entree]) => setEtat(entree?.isIntersecting ? "oui" : "non"),
      { rootMargin: "0px 0px -90% 0px" },
    );
    observateur.observe(heros);
    return () => observateur.disconnect();
  }, [pathname]);

  return etat;
}

export function PublicHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { user, loading } = useSession();
  const defile = useDefilement(8);
  const surHeros = useSurHerosSombre(pathname);

  // Le fond ne revient qu'une fois la page défilée ET le héros sombre quitté :
  // en haut de page il n'y a rien à séparer, et sur le héros la barre doit
  // rester fondue dedans.
  const avecFond = defile && surHeros !== "oui";

  const transitionMenu = useTransitionUI(DUREE_MENU);
  const transitionMenuSortie = useTransitionUI(DUREE_MENU, COURBE_SORTIE);

  // Tant que la session n'est pas restaurée, on n'affiche ni « Connexion » ni
  // « Mon espace » : basculer de l'un à l'autre après coup ferait sauter l'en-tête.
  const authLinks = loading ? null : user ? (
    <ButtonLink href={HOME_BY_ROLE[user.role]} variant="secondary" size="sm">
      Mon espace
    </ButtonLink>
  ) : (
    <>
      {/*
        « Connexion » redevient un LIEN, pas un bouton.

        Deux pastilles côte à côte se disputaient le clic : rien ne disait par
        où commencer à un visiteur qui n'a pas encore de compte — or c'est
        exactement le visiteur que cette page doit servir. Se connecter est un
        geste de retour : celui qui le cherche le trouve, il n'a pas besoin
        qu'on le lui propose au même volume que l'inscription.

        `min-h-9` aligne sa hauteur de cible sur celle du bouton voisin.
      */}
      <Link
        href="/connexion"
        className="flex min-h-9 items-center rounded-full px-2 text-sm font-semibold text-on-surface-variant transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary entete-connexion"
      >
        Connexion
      </Link>
      <ButtonLink href="/inscription" variant="secondary" size="sm">
        S&apos;inscrire
      </ButtonLink>
    </>
  );

  return (
    <header
      data-entete=""
      data-sur-heros={surHeros}
      className={cn(
        "fixed top-0 z-50 flex h-20 w-full items-center transition-[transform,background-color,box-shadow] duration-300 ease-out",
        /*
         * Retrait haut de 16 px tant que la barre flotte sans fond : collée au
         * bord de la fenêtre, elle touchait presque l'arête du panneau du héros
         * au lieu de s'y poser. Il disparaît quand le fond revient — une barre
         * pleine décollée du bord laisserait voir le contenu défiler dans
         * l'interstice. La barre remonte alors se caler en haut, comme on
         * accroche un élément qui passe en mode collant.
         *
         * `translate` et non `top` ou `margin` : le déplacement est confié au
         * compositeur, sans refaire la mise en page à chaque image.
         */
        avecFond
          ? "translate-y-0 bg-background/85 shadow-level-1 backdrop-blur-md"
          : "translate-y-4 bg-transparent",
      )}
    >
      {/*
        Deux colonnes sur mobile (logo | menu), trois à partir de `lg`. Les
        éléments masqués sont en `display: none` : ils ne consomment pas de
        cellule, la même grille sert donc les deux dispositions.

        Retrait latéral calé sur le héros de l'accueil, dont le panneau est
        encastré de 8 px (16 px dès `sm`) : avec le retrait standard, le logo
        tombait à 8 px du bord arrondi sur un téléphone — et PILE sur le bord
        entre `sm` et `lg`. 24 / 32 px le placent à l'aplomb du contenu du
        héros.
      */}
      <div className="mx-auto grid w-full max-w-container-max grid-cols-[1fr_auto] items-center gap-4 px-6 sm:px-8 lg:grid-cols-[1fr_auto_1fr] lg:px-margin-desktop">
        {/* `entete-logo` : blanc tant que la barre est posée sur un héros
            sombre (règle dans `globals.css`), navy partout ailleurs. */}
        <Logo className="entete-logo transition-colors duration-300" />

        <nav className="hidden lg:block" aria-label="Navigation principale">
          {/*
            Filet en plus de l'ombre.

            La capsule est blanche (#ffffff) sur un fond de page quasi blanc
            (#f9f9ff) : 1,05:1. Elle ne tenait donc QUE par une ombre à 12 %
            d'opacité — invisible sur un écran peu contrasté, en plein soleil,
            ou simplement mal calibré. Le liseré lui donne une existence qui ne
            dépend pas des conditions d'affichage.
          */}
          {/*
            Sur un héros sombre, la capsule devient une VITRE : blanc à 10 %,
            liseré à 20 %, sans ombre. Pleine et blanche, elle aurait été la
            surface la plus claire de l'écran, posée juste au-dessus du titre
            qu'elle doit laisser dominer.
          */}
          <ul className="flex items-center gap-1 rounded-full border border-outline-variant bg-surface-container-lowest p-1.5 shadow-level-2 transition-colors duration-300 entete-capsule">
            {publicNav.map((item) => {
              const actif = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={actif ? "page" : undefined}
                    className={cn(
                      /*
                       * `py-3` porte la cible à 44 px de haut. La capsule
                       * paraîtrait plus fine avec moins, mais `lg` commence à
                       * 1024 px — largeur d'une tablette, où l'on tape au doigt.
                       *
                       * Respiration horizontale réduite entre 1024 et 1280 px :
                       * à cette largeur, le logo, la capsule et les deux
                       * boutons tiennent à une trentaine de pixels près. Les
                       * libellés sont longs — « Pour les entreprises » — et ce
                       * sont eux qui décident, pas la marge.
                       */
                      // `entete-lien` : ton clair sur un héros sombre, page
                      // courante en or clair (règles dans `globals.css`).
                      "lien-nav entete-lien block rounded-full px-3 py-3 text-sm font-semibold leading-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary xl:px-4",
                      /*
                       * Plus de pastille au survol : c'est le filet qui porte
                       * désormais l'état. Empiler un fond ET un trait
                       * donnerait deux signaux pour une seule information, et
                       * le fond noierait justement le trait.
                       *
                       * La page courante garde DEUX indices — la couleur et le
                       * filet déployé — pour ne pas reposer sur la seule teinte.
                       * L'or foncé donne 6,4:1 sur la capsule blanche.
                       */
                      actif ? "text-secondary" : "text-on-surface-variant hover:text-primary",
                    )}
                  >
                    <span className="lien-nav-texte">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="hidden min-h-[36px] items-center gap-3 justify-self-end lg:flex">
          {authLinks}
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="entete-menu justify-self-end rounded-full p-2 text-primary transition-colors hover:bg-surface-container lg:hidden"
          aria-label="Menu"
          aria-expanded={open}
        >
          <Icon name={open ? "close" : "menu"} />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          /*
           * Panneau flottant plutôt que bandeau collé sous l'en-tête : sans le
           * filet de séparation, un bandeau pleine largeur n'aurait plus rien
           * qui le délimite. Il reprend la matière de la capsule — fond clair,
           * angles arrondis, ombre.
           *
           * Il se DÉPLOIE depuis le bouton menu (`origin-top-right`), avec la
           * même cadence que le menu « Moi » de l'Espace Jeune. Il apparaissait
           * jusqu'ici d'un bloc, par-dessus la page, sans rien qui le rattache
           * au bouton qu'on venait de toucher.
           */
          <motion.div
            key="menu-mobile"
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0, transition: transitionMenu }}
            exit={{ opacity: 0, scale: 0.96, y: -8, transition: transitionMenuSortie }}
            className="absolute left-margin-mobile right-margin-mobile top-[72px] origin-top-right rounded-xl bg-surface-container-lowest p-3 shadow-level-2 lg:hidden"
          >
            <nav aria-label="Navigation principale">
              <ul className="flex flex-col gap-1">
                {publicNav.map((item) => {
                  const actif = pathname === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={actif ? "page" : undefined}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold",
                          actif
                            ? "bg-surface-container text-secondary"
                            : "text-on-surface-variant hover:bg-surface-container",
                        )}
                      >
                        <Icon
                          name={item.icon}
                          className={actif ? "text-secondary" : "text-on-surface-variant"}
                        />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
            <div className="mt-3 flex flex-col gap-2">
              {loading ? null : user ? (
                <ButtonLink href={HOME_BY_ROLE[user.role]} variant="secondary" fullWidth>
                  Mon espace
                </ButtonLink>
              ) : (
                <>
                  <ButtonLink href="/connexion" variant="outline" fullWidth>
                    Connexion
                  </ButtonLink>
                  <ButtonLink href="/inscription" variant="secondary" fullWidth>
                    S&apos;inscrire
                  </ButtonLink>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
