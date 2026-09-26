import Image from "next/image";
import Link from "next/link";
import { Icon, ProgressBar, StarRating } from "@/components/ui";
import { mediaUrl } from "@/lib/api/urls";
import type { ApiFormationSummary } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { pastilleNiveau } from "./niveau";

interface FormationCardProps {
  formation: ApiFormationSummary;
  href?: string;
}

/**
 * Carte de cours, façon catalogue en ligne : vignette, titre, formateur, note
 * et méta.
 *
 * Chaque couleur y porte un sens, et le même partout : le niveau reprend la
 * teinte de son filtre, l'or marque ce qui délivre un certificat, le vert ce
 * qui est terminé. La carte se termine sur l'action qu'elle ouvre — commencer,
 * continuer ou revoir — pour qu'on sache ce que fera le clic.
 */
export function FormationCard({ formation, href = "#" }: FormationCardProps) {
  const f = formation;
  // Média public : une URL absolue suffit, pas de `blob:` comme pour les
  // documents protégés.
  const cover = mediaUrl(f.image);
  const started = f.progression > 0;
  const done = f.progression >= 100;

  return (
    <Link
      href={href}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-level-1 transition-[box-shadow,transform] duration-200 hover:-translate-y-1 hover:shadow-level-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2"
    >
      {/* Vignette. `inverse-surface` → `primary` et non `primary` →
          `primary-container` : ces deux-là valent la MÊME couleur dans la
          palette, le dégradé annoncé était donc un aplat. */}
      <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-gradient-to-br from-inverse-surface to-primary">
        {/* Sans couverture, le dégradé et l'icône font office de vignette : une
            formation reste publiable sans visuel. */}
        {cover ? (
          <Image
            src={cover}
            alt=""
            fill
            // Doit suivre la grille du catalogue (1 / 2 / 3 / 4 colonnes) :
            // une valeur trop basse sert une image floue en pleine largeur.
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <>
            <span
              aria-hidden
              className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-secondary-container/25 blur-2xl"
            />
            <Icon
              name="auto_stories"
              className="relative text-5xl text-white/85 transition-transform duration-300 group-hover:scale-110"
            />
          </>
        )}

        {/* Voile bas : les étiquettes restent lisibles sur n'importe quelle
            couverture, claire ou sombre. */}
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/45 to-transparent"
        />

        <span className="absolute left-2 top-2 rounded-full bg-black/45 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur">
          {f.categorie}
        </span>
        {f.populaire && (
          <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-secondary-container px-2.5 py-0.5 text-[11px] font-bold text-on-secondary-container shadow-level-1">
            <Icon name="trending_up" className="text-[13px]" /> Populaire
          </span>
        )}

        {/* Durée sur la vignette, comme une durée de vidéo : c'est le premier
            chiffre qu'on regarde avant de s'engager. */}
        <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-semibold text-white">
          <Icon name="timer" className="text-[13px]" /> {f.tempsLectureMin} min
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap gap-1.5">
          {f.niveau && (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                pastilleNiveau(f.niveau),
              )}
            >
              {f.niveau}
            </span>
          )}
          {f.certifiante && (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary-fixed px-2 py-0.5 text-[11px] font-semibold text-on-secondary-fixed">
              <Icon name="workspace_premium" className="text-[13px]" /> Certifiante
            </span>
          )}
        </div>

        <h3 className="line-clamp-2 font-bold leading-snug text-primary group-hover:underline">
          {f.titre}
        </h3>
        {f.instructeur && (
          <p className="flex items-center gap-1 text-xs text-on-surface-variant">
            <Icon name="person" className="text-[14px]" /> {f.instructeur}
          </p>
        )}

        {typeof f.note === "number" && <StarRating value={f.note} count={f.nombreAvis} />}

        <p className="flex items-center gap-1 text-xs text-on-surface-variant">
          <Icon name="menu_book" className="text-[14px] text-primary/70" />
          {/* Compté côté serveur : la liste ne transporte pas le contenu du cours. */}
          {f.nombreChapitres} chapitre{f.nombreChapitres > 1 ? "s" : ""}
        </p>

        <div className="mt-auto space-y-2 pt-2">
          {started && (
            <div className="space-y-1">
              <ProgressBar
                value={f.progression}
                className="h-1.5"
                barClassName={done ? "bg-success" : undefined}
              />
              <p
                className={cn(
                  "text-xs font-semibold",
                  done ? "text-success" : "text-on-surface-variant",
                )}
              >
                {done ? "Terminé" : `${f.progression}% complété`}
              </p>
            </div>
          )}

          {/* L'action que le clic déclenche — nommée, et non devinée. */}
          <p className="flex items-center justify-between border-t border-outline-variant pt-2.5 text-sm font-bold text-primary">
            {done ? "Revoir le cours" : started ? "Continuer" : "Commencer"}
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 transition-colors duration-200 group-hover:bg-primary group-hover:text-on-primary">
              <Icon name="arrow_forward" className="text-[16px]" />
            </span>
          </p>
        </div>
      </div>
    </Link>
  );
}
