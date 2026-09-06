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
 * Les couleurs ne changent pas : la capsule est blanche sur le fond de page,
 * la page active passe en or foncé, et les boutons étaient DÉJÀ des pastilles
 * (`rounded-full` dans `Button`) — c'est le reste qui s'aligne sur eux.
 *
 * ── Ce qui est corrigé au passage ───────────────────────────────────────────
 *
 * `aria-current="page"` manquait. La page courante n'était signalée que par sa
 * couleur : invisible pour un lecteur d'écran, et invisible tout court pour qui
 * ne distingue pas l'or du gris.
 */
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./logo";
import { Icon, ButtonLink } from "@/components/ui";
import { useSession } from "@/features/auth/session-provider";
import { HOME_BY_ROLE } from "@/lib/config";
import { publicNav } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function PublicHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { user, loading } = useSession();

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
        className="flex min-h-9 items-center rounded-full px-2 text-sm font-semibold text-on-surface-variant transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        Connexion
      </Link>
      <ButtonLink href="/inscription" variant="secondary" size="sm">
        S&apos;inscrire
      </ButtonLink>
    </>
  );

  return (
    <header className="fixed top-0 z-50 flex h-20 w-full items-center bg-background/80 backdrop-blur-md">
      {/*
        Deux colonnes sur mobile (logo | menu), trois à partir de `lg`. Les
        éléments masqués sont en `display: none` : ils ne consomment pas de
        cellule, la même grille sert donc les deux dispositions.
      */}
      <div className="mx-auto grid w-full max-w-container-max grid-cols-[1fr_auto] items-center gap-4 px-margin-mobile lg:grid-cols-[1fr_auto_1fr] lg:px-margin-desktop">
        <Logo />

        <nav className="hidden lg:block" aria-label="Navigation principale">
          {/*
            Filet en plus de l'ombre.

            La capsule est blanche (#ffffff) sur un fond de page quasi blanc
            (#f9f9ff) : 1,05:1. Elle ne tenait donc QUE par une ombre à 12 %
            d'opacité — invisible sur un écran peu contrasté, en plein soleil,
            ou simplement mal calibré. Le liseré lui donne une existence qui ne
            dépend pas des conditions d'affichage.
          */}
          <ul className="flex items-center gap-1 rounded-full border border-outline-variant bg-surface-container-lowest p-1.5 shadow-level-2">
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
                      "lien-nav block rounded-full px-3 py-3 text-sm font-semibold leading-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary xl:px-4",
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
          className="justify-self-end rounded-full p-2 text-primary hover:bg-surface-container lg:hidden"
          aria-label="Menu"
          aria-expanded={open}
        >
          <Icon name={open ? "close" : "menu"} />
        </button>
      </div>

      {open && (
        /*
         * Panneau flottant plutôt que bandeau collé sous l'en-tête : sans le
         * filet de séparation, un bandeau pleine largeur n'aurait plus rien
         * qui le délimite. Il reprend la matière de la capsule — fond clair,
         * angles arrondis, ombre.
         */
        <div className="absolute left-margin-mobile right-margin-mobile top-[72px] rounded-xl bg-surface-container-lowest p-3 shadow-level-2 lg:hidden">
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
        </div>
      )}
    </header>
  );
}
