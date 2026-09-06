import Image from "next/image";
import Link from "next/link";
import { Icon, ProgressBar, StarRating } from "@/components/ui";
import { mediaUrl } from "@/lib/api/urls";
import type { ApiFormationSummary } from "@/lib/api/types";
import { cn } from "@/lib/utils";

interface FormationCardProps {
  formation: ApiFormationSummary;
  href?: string;
}

/** Udemy-style course card: thumbnail, title, instructor, rating and meta. */
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
      className="group flex flex-col overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest transition-shadow hover:shadow-level-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2"
    >
      {/* Thumbnail */}
      {/* `inverse-surface` → `primary` et non `primary` → `primary-container` :
          ces deux-là valent la MÊME couleur dans la palette (#0b1f3a), le
          dégradé annoncé était donc un aplat. */}
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
            className="object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <Icon
            name="auto_stories"
            className="text-4xl text-white/85 transition-transform group-hover:scale-110"
          />
        )}
        <span className="absolute left-2 top-2 rounded bg-black/40 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur">
          {f.categorie}
        </span>
        {f.populaire && (
          <span className="absolute right-2 top-2 rounded bg-secondary-container px-2 py-0.5 text-[11px] font-bold text-on-secondary-container">
            Populaire
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 font-bold leading-snug text-primary">{f.titre}</h3>
        {f.instructeur && <p className="text-xs text-on-surface-variant">{f.instructeur}</p>}

        {typeof f.note === "number" && (
          <StarRating value={f.note} count={f.nombreAvis} className="mt-0.5" />
        )}

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-on-surface-variant">
          <span className="flex items-center gap-0.5">
            <Icon name="timer" className="text-[14px]" /> {f.tempsLectureMin} min
          </span>
          <span aria-hidden>·</span>
          {/* Compté côté serveur : la liste ne transporte pas le contenu du cours. */}
          <span>{f.nombreChapitres} chapitres</span>
          {f.niveau && (
            <>
              <span aria-hidden>·</span>
              <span>{f.niveau}</span>
            </>
          )}
        </div>

        {/* Progress (enrolled) or certifiante tag */}
        <div className="mt-auto pt-2">
          {started ? (
            <div className="space-y-1">
              <ProgressBar value={f.progression} className="h-1.5" />
              <p
                className={cn(
                  "text-xs font-semibold",
                  done ? "text-success" : "text-on-surface-variant",
                )}
              >
                {done ? "Terminé" : `${f.progression}% complété`}
              </p>
            </div>
          ) : (
            f.certifiante && (
              <span className="flex items-center gap-1 text-xs font-semibold text-success">
                <Icon name="verified" className="text-[14px]" /> Certifiante
              </span>
            )
          )}
        </div>
      </div>
    </Link>
  );
}
