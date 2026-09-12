"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Logo } from "./logo";
import { Avatar, Icon, RetourEnHaut } from "@/components/ui";
import {
  COURBE_SORTIE,
  DUREE_FEUILLE,
  DUREE_PANNEAU,
  DUREE_VOILE,
  useTransitionUI,
} from "@/components/motion/transitions";
import { LogoutButton } from "@/features/auth/logout-button";
import { isNavGroup, type NavEntry, type NavGroup, type NavItem } from "@/lib/navigation";
import { useDefilement } from "@/lib/use-defilement";
import { cn } from "@/lib/utils";


const NAV_STATE_KEY = "o2w:nav-groups";

/**
 * Barre latérale réduite : préférence PERSISTANTE, comme l'ouverture des
 * groupes.
 *
 * Un réglage de mise en page qui se réinitialise à chaque navigation est un
 * réglage qu'on cesse d'utiliser. Il est relu après le montage, jamais pendant
 * le rendu : le serveur n'a pas `localStorage`, et le lire directement ferait
 * diverger l'hydratation.
 */
const NAV_COLLAPSED_KEY = "o2w:nav-reduite";

/** Largeur du rail réduit — deux fois la boîte d'icône, plus les gouttières. */
const LARGEUR_RAIL = "5rem";
const LARGEUR_BARRE = "16rem";

function readNavGroupState(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(NAV_STATE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function writeNavGroupState(label: string, open: boolean): void {
  try {
    window.localStorage.setItem(
      NAV_STATE_KEY,
      JSON.stringify({ ...readNavGroupState(), [label]: open }),
    );
  } catch {
    // Stockage indisponible (navigation privée, quota) : la préférence ne
    // survivra pas au rechargement, ce qui n'empêche rien.
  }
}

interface AppUser {
  name: string;
  role: string; // display label under the name
  photo?: string;
}

interface AppShellProps {
  nav: NavEntry[];
  user: AppUser;
  /** Home href for the space, used to detect the exact dashboard route. */
  homeHref: string;
  roleLabel: string;
  /**
   * Écran de notifications de l'espace, s'il en a un : la cloche de l'en-tête
   * n'est rendue que dans ce cas. Voir le commentaire au point de rendu.
   */
  notificationsHref?: string;
  children: React.ReactNode;
}

const linkBase =
  "flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all";

/**
 * Rangée réduite : carré centré, sans libellé.
 *
 * La hauteur ne change pas entre les deux états — seule la largeur bouge. Une
 * barre qui se réduit ET se densifie ferait sauter la position verticale de
 * chaque rubrique, et l'on perdrait l'endroit où l'on était.
 */
const railBase = "mx-auto flex h-11 w-11 items-center justify-center rounded-lg px-0";

function NavLink({
  item,
  active,
  nested,
  reduite,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  nested?: boolean;
  /** Barre latérale réduite : icône seule, libellé en infobulle. */
  reduite?: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      // Le libellé n'est PAS perdu quand il n'est plus écrit : il reste
      // l'annonce du lien pour les lecteurs d'écran, et l'infobulle pour la
      // souris. Sans cela, un rail d'icônes est une devinette.
      title={reduite ? item.label : undefined}
      aria-label={reduite ? item.label : undefined}
      className={cn(
        linkBase,
        // Les enfants sont décalés et légèrement plus discrets : la hiérarchie
        // se lit sans avoir à ouvrir le groupe.
        nested && "py-2 pl-11 text-[13px] font-medium",
        reduite && railBase,
        active
          ? "bg-secondary-container text-on-secondary-container"
          : "text-on-surface-variant hover:bg-surface-container",
      )}
    >
      {!nested && <Icon name={item.icon} filled={active} />}
      {nested && (
        <span
          className={cn(
            "h-1.5 w-1.5 shrink-0 rounded-full",
            active ? "bg-on-secondary-container" : "bg-outline",
          )}
        />
      )}
      {!reduite && item.label}
    </Link>
  );
}

/**
 * Rubrique repliable de la barre latérale.
 *
 * Le groupe s'ouvre tout seul quand on se trouve sur l'une de ses pages —
 * sinon, arriver sur `/admin/referentiels/...` par un lien direct laisserait la
 * navigation refermée sur la page courante. L'utilisateur garde ensuite la
 * main : son choix d'ouverture ou de fermeture prime.
 */
function NavGroupBlock({
  group,
  isActive,
  reduite,
  onDeplier,
  onNavigate,
}: {
  group: NavGroup;
  isActive: (href: string) => boolean;
  reduite?: boolean;
  /** Rouvre la barre : un groupe n'a rien à montrer dans un rail d'icônes. */
  onDeplier: () => void;
  onNavigate: () => void;
}) {
  const panelId = useId();
  const hasActiveChild = group.children.some((child) => isActive(child.href));

  const [expanded, setExpanded] = useState(hasActiveChild);
  // Anime seulement après le premier rendu : sans ce garde, un groupe restauré
  // ouvert se déplierait sous les yeux de l'utilisateur au chargement.
  const [mounted, setMounted] = useState(false);

  // Restauration de la préférence. Lue après le montage, jamais pendant le
  // rendu : le serveur n'a pas accès à `localStorage`, la lire directement
  // provoquerait une divergence d'hydratation.
  useEffect(() => {
    const stored = readNavGroupState()[group.label];
    if (stored !== undefined) setExpanded(stored || hasActiveChild);
    setMounted(true);
    // Au montage uniquement : la navigation est gérée par l'effet suivant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group.label]);

  // Naviguer vers une page du groupe le rouvre, même si l'utilisateur l'avait
  // replié : masquer l'emplacement courant dans la navigation désoriente.
  useEffect(() => {
    if (hasActiveChild) setExpanded(true);
  }, [hasActiveChild]);

  const toggle = () => {
    // Barre réduite : le panneau des enfants n'a nulle part où s'ouvrir. Le
    // clic REDÉPLOIE la barre et ouvre le groupe — c'est le seul geste qui
    // mène quelque part, plutôt qu'un bouton qui ne fait rien de visible.
    if (reduite) {
      onDeplier();
      setExpanded(true);
      writeNavGroupState(group.label, true);
      return;
    }

    const next = !expanded;
    setExpanded(next);
    writeNavGroupState(group.label, next);
  };

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={reduite ? false : expanded}
        aria-controls={panelId}
        title={reduite ? group.label : undefined}
        aria-label={reduite ? group.label : undefined}
        className={cn(
          linkBase,
          "w-full text-left",
          reduite && railBase,
          // Le groupe lui-même n'est pas une destination : il est mis en avant
          // quand l'une de ses pages est ouverte, sans être marqué « actif ».
          hasActiveChild
            ? "text-primary hover:bg-surface-container"
            : "text-on-surface-variant hover:bg-surface-container",
        )}
      >
        <Icon name={group.icon} filled={hasActiveChild} />
        {!reduite && (
          <>
            <span className="flex-1">{group.label}</span>
            <Icon
              name="chevron_right"
              aria-hidden
              className={cn(
                "text-[18px]",
                mounted &&
                  "transition-transform duration-200 ease-out motion-reduce:transition-none",
                expanded && "rotate-90",
              )}
            />
          </>
        )}
      </button>

      {/*
        Dépliement animé par `grid-template-rows: 0fr → 1fr`.

        Contrairement à `max-height`, cette technique s'anime vers la hauteur
        RÉELLE du contenu : ajouter une rubrique au groupe ne demande pas de
        réajuster une valeur en dur, et l'animation ne « saute » pas.

        `inert` retire le panneau replié de l'ordre de tabulation et de l'arbre
        d'accessibilité — sans lui, les liens invisibles resteraient atteignables
        au clavier.
      */}
      <div
        id={panelId}
        inert={!expanded || reduite}
        className={cn(
          "grid",
          mounted &&
            "transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
          expanded && !reduite ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        {/* `min-h-0` est indispensable : sans lui la ligne de grille refuse de
            passer sous la hauteur naturelle du contenu. */}
        <div className="min-h-0 overflow-hidden">
          <div className="mt-1 flex flex-col gap-1">
            {group.children.map((child) => (
              <NavLink
                key={child.href}
                item={child}
                active={isActive(child.href)}
                nested
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Sidebar + top-bar layout for every authenticated space. */
export function AppShell({
  nav,
  user,
  homeHref,
  roleLabel,
  notificationsHref,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [reduite, setReduite] = useState(false);

  // Mêmes cadences que la feuille « Plus » de l'Espace Jeune : un tiroir
  // traverse autant d'écran qu'une feuille, il prend donc son temps.
  const transitionTiroir = useTransitionUI(DUREE_FEUILLE);
  const transitionTiroirSortie = useTransitionUI(DUREE_PANNEAU, COURBE_SORTIE);
  const transitionVoile = useTransitionUI(DUREE_VOILE);

  // L'en-tête ne gagne son ombre qu'une fois du contenu passé dessous : en haut
  // de page, il n'y a rien à séparer.
  const defile = useDefilement(8);

  // Préférence relue APRÈS le montage : le serveur rend toujours la barre
  // déployée, et le rail ne s'installe qu'une fois `localStorage` lisible.
  // Sans ce détour, React signalerait une divergence d'hydratation.
  useEffect(() => {
    try {
      setReduite(window.localStorage.getItem(NAV_COLLAPSED_KEY) === "1");
    } catch {
      // Stockage indisponible : la barre reste déployée, ce qui n'empêche rien.
    }
  }, []);

  const memoriser = (valeur: boolean) => {
    try {
      window.localStorage.setItem(NAV_COLLAPSED_KEY, valeur ? "1" : "0");
    } catch {
      // Voir plus haut : la préférence ne survivra pas au rechargement.
    }
  };

  const basculerReduction = () => {
    setReduite((actuel) => {
      memoriser(!actuel);
      return !actuel;
    });
  };

  // Redéploiement provoqué par un clic sur un groupe : mémorisé au même titre
  // qu'un clic sur le bouton, sinon la barre se réduirait de nouveau au
  // prochain chargement alors que l'utilisateur vient de la rouvrir.
  const deplier = () => {
    setReduite(false);
    memoriser(false);
  };

  const isActive = (href: string) =>
    href === homeHref ? pathname === href : pathname.startsWith(href);

  /*
   * La barre est rendue DEUX FOIS — rail de bureau et tiroir mobile — avec le
   * même arbre. Le tiroir reçoit toujours `reduite = false` : sur un panneau
   * qui recouvre l'écran, réduire à des icônes ne gagne aucune place et ne
   * ferait que retirer les libellés.
   */
  const barre = (rail: boolean) => (
    <div className="flex h-full flex-col gap-2">
      <div className={cn("flex h-16 items-center", rail ? "justify-center px-0" : "px-2")}>
        <Logo href={homeHref} compact={rail} />
      </div>

      {/* La catégorie de l'espace n'a pas d'abréviation honnête : plutôt qu'un
          sigle inventé, le rail la remplace par un simple filet de séparation. */}
      {rail ? (
        <span className="mx-auto my-2 h-px w-8 bg-outline-variant" aria-hidden />
      ) : (
        <span className="px-4 pb-2 pt-3 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
          {roleLabel}
        </span>
      )}

      <nav className="flex flex-1 flex-col gap-1">
        {nav.map((entry) =>
          isNavGroup(entry) ? (
            <NavGroupBlock
              key={entry.label}
              group={entry}
              isActive={isActive}
              reduite={rail}
              onDeplier={deplier}
              onNavigate={() => setMobileOpen(false)}
            />
          ) : (
            <NavLink
              key={entry.href}
              item={entry}
              active={isActive(entry.href)}
              reduite={rail}
              onNavigate={() => setMobileOpen(false)}
            />
          ),
        )}
      </nav>

      <LogoutButton
        compact={rail}
        className={cn(
          "rounded-lg text-sm font-semibold text-on-surface-variant hover:bg-surface-container",
          rail ? "mx-auto h-11 w-11 justify-center" : "w-full px-4 py-2.5",
        )}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside
        // `overflow-y-auto` : douze rubriques plus un groupe déplié dépassent
        // la hauteur d'un portable 13 pouces — sans lui, la déconnexion et les
        // dernières entrées deviennent inatteignables.
        className="fixed inset-y-0 left-0 hidden overflow-y-auto border-r border-outline-variant bg-surface-container-lowest px-3 py-2 transition-[width] duration-200 ease-out motion-reduce:transition-none lg:block"
        style={{ width: reduite ? LARGEUR_RAIL : LARGEUR_BARRE }}
      >
        {barre(reduite)}
      </aside>

      {/*
        Tiroir mobile.

        Il SORT du bord gauche — là où vit la barre sur grand écran — et y
        retourne. Il apparaissait jusqu'ici d'un bloc, voile compris : rien ne
        disait d'où venait ce panneau ni par où il repartirait, et la fermeture
        était un simple escamotage.

        `AnimatePresence` entoure le conteneur : sans lui, `mobileOpen` à faux
        démonterait le tiroir avant qu'il ait pu repartir. Le voile se fond à
        part, sans glisser avec le tiroir — sinon il découvrirait la page par
        la gauche, comme un rideau qu'on tire.
      */}
      <AnimatePresence>
        {mobileOpen && (
          <div key="tiroir-mobile" className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: transitionVoile }}
              exit={{ opacity: 0, transition: transitionVoile }}
              className="absolute inset-0 bg-primary/40 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0, transition: transitionTiroir }}
              exit={{ x: "-100%", transition: transitionTiroirSortie }}
              className="absolute inset-y-0 left-0 w-64 overflow-y-auto bg-surface-container-lowest px-3 py-2 shadow-level-2"
            >
              {barre(false)}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/*
        Le décalage du contenu suit la barre au pixel près, et par une variable
        plutôt que par deux classes `lg:pl-*` : sur mobile la barre n'occupe
        aucune place, d'où le `padding` piloté par média-requête dans la classe
        et la largeur, elle, par le style en ligne.
      */}
      <div
        className="transition-[padding] duration-200 ease-out motion-reduce:transition-none lg:pl-[var(--largeur-barre)]"
        style={{ "--largeur-barre": reduite ? LARGEUR_RAIL : LARGEUR_BARRE } as React.CSSProperties}
      >
        {/* Top bar */}
        <header
          className={cn(
            "sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b bg-background/80 px-margin-mobile backdrop-blur-md transition-shadow duration-200 lg:px-8",
            defile ? "border-transparent shadow-level-2" : "border-outline-variant",
          )}
        >
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-full p-2 text-primary hover:bg-surface-container lg:hidden"
            aria-label="Ouvrir le menu"
          >
            <Icon name="menu" />
          </button>

          {/*
            Même geste que le bouton mobile, au même endroit : ouvrir ou fermer
            la navigation. Le tiroir se superpose faute de place, le rail se
            replie parce qu'il y en a — c'est la seule différence, et elle n'a
            pas à se voir.
          */}
          <button
            type="button"
            onClick={basculerReduction}
            aria-expanded={!reduite}
            title={reduite ? "Déployer la navigation" : "Réduire la navigation"}
            aria-label={reduite ? "Déployer la navigation" : "Réduire la navigation"}
            className="hidden rounded-full p-2 text-primary transition-colors hover:bg-surface-container lg:block"
          >
            <Icon name="menu" />
          </button>

          <div className="ml-auto flex items-center gap-2">
            {/*
              La cloche n'apparaît que si l'espace a un écran de notifications à
              montrer.

              Elle était rendue partout, sans `onClick` ni `href` : un bouton
              présent sur CHAQUE page de l'administration, qu'on essaie une
              fois, deux fois, avant de conclure que l'interface est cassée. Ni
              l'administration ni l'Espace Entreprise n'ont d'écran de
              notifications aujourd'hui — le jour où l'un en aura, il passera
              `notificationsHref` et la cloche reviendra, fonctionnelle.
            */}
            {notificationsHref && (
              <Link
                href={notificationsHref}
                className="rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary"
                aria-label="Notifications"
                title="Notifications"
              >
                <Icon name="notifications" />
              </Link>
            )}
            <div className="flex items-center gap-3 border-l border-outline-variant pl-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold leading-tight text-on-surface">{user.name}</p>
                <p className="text-xs text-on-surface-variant">{user.role}</p>
              </div>
              <Avatar src={user.photo} alt={user.name} size={40} />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-container-max px-margin-mobile py-6 lg:px-8 lg:py-8">
          {children}
        </main>

        <RetourEnHaut />
      </div>
    </div>
  );
}
