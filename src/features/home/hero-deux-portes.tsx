/**
 * Héros : deux portes, dans un cadre encastré.
 *
 * ── La composition ──────────────────────────────────────────────────────────
 *
 * Reprise de la référence fournie (landing Taskora), pour la STRUCTURE
 * uniquement - les couleurs restent celles de la marque :
 *
 *  1. Un cadre arrondi encastré : la scène ne touche pas les bords de la
 *     fenêtre, elle repose sur un fond légèrement différent. Ce liseré de
 *     respiration donne l'impression d'un objet posé, pas d'un fond étalé.
 *  2. Un titre centré dont la fin bascule en accent : l'œil s'arrête sur le
 *     mot qui porte la promesse plutôt que de balayer une ligne uniforme.
 *  3. Des micro-cartes flottantes, légèrement pivotées, qui débordent de la
 *     colonne de texte et cassent la symétrie.
 *
 * ── Ce qui n'a PAS été repris, et pourquoi ──────────────────────────────────
 *
 * La référence ancre son héros sur une grande capture de tableau de bord.
 * Reproduire cela en `div` - faux graphiques, fausses lignes de tâches - est
 * le signal le plus reconnaissable d'une interface fabriquée par une machine,
 * et c'est précisément ce qui a été retiré de cette page. Une vraie capture
 * conviendrait ; à défaut, ce sont les deux portes qui ancrent le bas du
 * héros.
 *
 * De même, les micro-cartes portent un AVIS RÉEL venu de la base, pas un faux
 * message d'un faux collègue.
 *
 * ── Le fond du sujet ────────────────────────────────────────────────────────
 *
 * La page servait aux deux publics deux boutons identiques. Un étudiant de
 * 21 ans et un DRH y lisaient la même chose, dans la même forme. Les panneaux
 * sont donc DÉLIBÉRÉMENT INÉGAUX : le jeune plus large et plein, l'entreprise
 * plus étroite et en contour. Deux panneaux égaux seraient « équitables » et
 * illisibles - rien ne dirait par où commencer.
 */
import Link from "next/link";
import { SceneScrub } from "@/components/motion/scene-scrub";
import { Icon, StarRating } from "@/components/ui";
import type { ApiTemoignage } from "@/lib/api/types";
import { cn } from "@/lib/utils";

interface PorteProps {
  href: string;
  eyebrow: string;
  titre: string;
  description: string;
  action: string;
  /** Porte principale : fond plein, corps plus grand, colonne plus large. */
  principale?: boolean;
}

function Porte({ href, eyebrow, titre, description, action, principale }: PorteProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex flex-col justify-between gap-6 rounded-xl p-6 transition-colors sm:p-8",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-primary",
        principale
          ? "bg-surface-container-lowest text-on-surface hover:bg-surface-container-low lg:col-span-3"
          : // 35 % et non 25 % : cette bordure est le SEUL contour de la porte
            // entreprise. À 25 % elle donnait 2,2:1 contre le fond, sous les
            // 3:1 que la WCAG 1.4.11 exige d'un élément d'interface non
            // textuel. À 35 % elle atteint 3,2:1, sans devenir un cadre dur.
            "border border-white/35 text-white hover:border-white/60 hover:bg-white/5 lg:col-span-2",
      )}
    >
      <div className="space-y-3">
        <p
          className={cn(
            "text-sm font-semibold",
            principale ? "text-on-surface-variant" : "text-white/60",
          )}
        >
          {eyebrow}
        </p>
        <p
          className={cn(
            "font-headline font-bold leading-tight",
            principale ? "text-2xl text-primary sm:text-3xl" : "text-xl sm:text-2xl",
          )}
        >
          {titre}
        </p>
        <p className={cn("text-sm", principale ? "text-on-surface-variant" : "text-white/70")}>
          {description}
        </p>
      </div>

      <span
        className={cn(
          "inline-flex items-center gap-2 font-semibold",
          principale ? "text-primary" : "text-secondary-fixed-dim",
        )}
      >
        {action}
        {/* La flèche avance au survol : le mouvement dit « ça mène ailleurs »
            mieux qu'un changement de couleur. */}
        <Icon
          name="arrow_forward"
          className="text-[20px] transition-transform group-hover:translate-x-1"
        />
      </span>
    </Link>
  );
}

/**
 * Micro-carte flottante.
 *
 * Masquée sous `lg` : pivotée et posée en dehors de la colonne, elle
 * chevaucherait le titre sur un écran étroit. Une décoration qui gêne la
 * lecture n'a pas sa place sur mobile.
 *
 * `aria-hidden` : son contenu est repris dans le corps de la page (les
 * témoignages plus bas). L'annoncer deux fois ferait lire un avis hors de son
 * contexte, sans savoir de quoi il parle.
 */
function CarteFlottante({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute hidden w-60 rounded-xl bg-surface-container-lowest p-4 shadow-level-2 lg:block",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function HeroDeuxPortes({ temoignage }: { temoignage?: ApiTemoignage }) {
  return (
    /*
     * Deux couches : le fond de page, puis la scène encastrée. La marge du
     * cadre est plus étroite sur mobile, où chaque pixel de largeur compte.
     */
    /*
     * Le sol du cadre passe de `surface-container` à `background`.
     *
     * L'en-tête n'a plus de filet de séparation ; il se posait donc sur un fond
     * (#f9f9ff) qui rencontrait celui du héros (#e7eeff) en une marche de ton
     * sans rien pour la justifier — une couture qui se lisait comme un défaut
     * d'assemblage. Les deux surfaces sont désormais la MÊME, et l'en-tête se
     * confond avec le sol sur lequel repose le panneau navy.
     *
     * Le panneau ne perd rien : c'est son navy contre le presque-blanc qui le
     * fait exister, pas la nuance du liseré autour.
     */
    <section className="bg-background px-2 pb-2 pt-2 sm:px-4 sm:pb-4">
      {/*
        `champ-heros` : lueur or derrière le titre, sol assombri sous les
        portes. Aucun motif — voir la construction et les mesures de contraste
        dans `globals.css`.

        `SceneScrub` lie le retrait du panneau au défilement : la valeur suit le
        doigt image par image, au lieu de se déclencher à un seuil. C'est la
        mécanique du héros pris en modèle, sans sa séquence d'images.
      */}
      <SceneScrub className="champ-heros relative overflow-hidden rounded-xl text-white sm:rounded-[1.75rem]">
        <div className="relative mx-auto max-w-container-max px-margin-mobile pb-12 pt-16 lg:px-margin-desktop lg:pb-16 lg:pt-24">
          <div className="relative mx-auto max-w-3xl text-center">
            {/* Gauche : la preuve sociale, en amorce. */}
            {temoignage && (
              <CarteFlottante className="-left-16 top-6 -rotate-6 xl:-left-28">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container text-xs font-bold text-primary">
                    {temoignage.auteurNom.slice(0, 1)}
                  </span>
                  <p className="text-sm font-semibold text-primary">{temoignage.auteurNom}</p>
                </div>
                <p className="mt-2 line-clamp-3 text-xs text-on-surface-variant">
                  {temoignage.commentaire}
                </p>
                <div className="mt-2">
                  <StarRating value={temoignage.note} showValue={false} />
                </div>
              </CarteFlottante>
            )}

            {/* Droite : la contrepartie recruteur. */}
            <CarteFlottante className="-right-16 top-24 rotate-6 xl:-right-28">
              <div className="flex items-center gap-2">
                <Icon name="verified" className="text-[18px] text-success" filled />
                <p className="text-sm font-semibold text-primary">Profil vérifié</p>
              </div>
              <p className="mt-1 text-xs text-on-surface-variant">
                Test de validation passé, formations attestées.
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-container">
                <div className="h-full w-[92%] rounded-full bg-secondary" />
              </div>
            </CarteFlottante>

            <h1 className="text-balance font-headline text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              De l&apos;orientation à{" "}
              {/* Le mot qui porte la promesse bascule en accent : c'est là que
                  l'œil doit s'arrêter, pas au début de la ligne. */}
              <span className="text-secondary-fixed-dim">l&apos;opportunité</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-white/70">
              La plateforme marocaine qui relie les jeunes talents aux entreprises qui recrutent.
            </p>
          </div>

          {/*
            Les deux portes ancrent le bas du héros - la place qu'occupe la
            capture produit dans la référence. Grille de 5 colonnes, pas de 2 :
            c'est elle qui rend les panneaux inégaux (3 / 2) sans largeurs
            fixes. Sous `lg`, ils s'empilent dans l'ordre de lecture.
          */}
          <div className="mt-12 grid gap-4 lg:grid-cols-5 lg:gap-5">
            <Porte
              principale
              href="/inscription?role=jeune"
              eyebrow="Vous cherchez un stage ou un emploi"
              titre="Faites valider votre profil, puis postulez"
              description="Test de validation, formations certifiantes, puis accès aux offres de nos entreprises partenaires."
              action="Créer mon profil"
            />
            <Porte
              href="/inscription?role=entreprise"
              eyebrow="Vous recrutez"
              titre="Recevez des profils déjà qualifiés"
              description="Compte validé par OMB, publication d'offres, accès aux candidats testés."
              action="Ouvrir un compte entreprise"
            />
          </div>
        </div>
      </SceneScrub>
    </section>
  );
}
