/**
 * Types d'opportunité, en entrée du catalogue.
 *
 * Pièce n°2 du motif « Marketplace / Directory » (`ui-ux-pro-max`), et la seule
 * qui manquait : après la recherche vient le PARCOURS. Tout le monde n'arrive
 * pas avec un mot-clé en tête — beaucoup viennent voir « ce qu'il y a », et
 * n'avaient jusqu'ici aucune porte d'entrée avant le catalogue complet.
 *
 * Chaque tuile mène au catalogue de l'Espace Jeune déjà filtré
 * (`/espace-jeune/offres?type=…`), grâce au paramètre d'URL que
 * `useRechercheOffres` lit déjà. Le catalogue public (`/offres`) a été retiré :
 * un visiteur non connecté passe donc par la connexion (`RequireRole`) avant
 * d'arriver aux offres.
 *
 * Les libellés viennent du référentiel serveur (`OPPORTUNITY_TYPES`), pas d'une
 * liste recopiée : ajouter un type côté API l'ajoute ici, et un type retiré
 * n'ouvre pas une page vide.
 */
import Link from "next/link";
import { Icon, type IconName } from "@/components/ui";
import { OPPORTUNITY_TYPES } from "@/lib/constants";

/**
 * Icône par type d'opportunité.
 *
 * Table exhaustive sur les valeurs connues, avec un repli explicite : un type
 * ajouté au référentiel s'affiche avec l'icône générique plutôt que de faire
 * échouer le rendu.
 */
const ICONES: Record<string, IconName> = {
  Emploi: "work",
  Stage: "school",
  PFE: "assignment",
  Alternance: "all_inclusive",
  Freelance: "person",
  Projet: "rocket_launch",
};

export function CategoriesSection() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {OPPORTUNITY_TYPES.map((type) => (
        <Link
          key={type}
          href={`/espace-jeune/offres?type=${encodeURIComponent(type)}`}
          /*
           * `min-h-28` : cible tactile largement au-dessus des 44 px exigés, et
           * hauteur identique pour toutes, sinon la rangée se déforme selon la
           * longueur du libellé. Deux crans de plus qu'avant pour loger la
           * pastille sans tasser le libellé contre elle.
           *
           * L'élévation au survol remplace le simple changement de bordure : une
           * tuile qui se soulève dit « cliquable » avant qu'on ait lu quoi que
           * ce soit, là où un liseré qui passe du gris au navy ne se remarque
           * qu'une fois le pointeur dessus.
           */
          className="group flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2.5 rounded-xl border border-outline-variant bg-surface-container-lowest p-3 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:shadow-level-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2"
        >
          {/*
            La pastille est le seul endroit de la tuile où la couleur peut
            entrer : elle ne porte aucun texte. Crème au repos, elle bascule en
            navy à icône or au survol (voir `.pastille-or` dans `globals.css`).
            Une icône navy posée à même la carte se confondait avec le libellé
            qu'elle accompagne.
          */}
          <span className="pastille-or flex h-11 w-11 items-center justify-center rounded-lg">
            <Icon
              name={ICONES[type] ?? "category"}
              className="text-[24px] transition-transform duration-200 group-hover:scale-110"
            />
          </span>
          {/* Navy plutôt que `on-surface` : le libellé appartient à la famille
              de la marque, et gagne au passage un cran de contraste. */}
          <span className="text-sm font-semibold text-primary">{type}</span>
        </Link>
      ))}
    </div>
  );
}
