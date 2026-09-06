/**
 * Les deux parcours, en deux mises en page distinctes.
 *
 * ── Le problème résolu ──────────────────────────────────────────────────────
 *
 * « Comment ça marche » présentait deux colonnes strictement identiques : même
 * carte, même liste numérotée, même largeur, pour deux publics qui n'ont ni le
 * même besoin ni le même temps d'attention. Ce parallélisme est confortable à
 * coder et trompeur à lire : il affirme que les deux expériences sont les
 * mêmes, alors qu'elles n'ont rien à voir.
 *
 *  • Le jeune vit un CHEMINEMENT : quatre étapes qui s'enchaînent dans le
 *    temps, chacune conditionnant la suivante. D'où une frise verticale
 *    connectée, où le trait entre les jalons porte le sens.
 *  • L'entreprise suit une PROCÉDURE : des conditions à remplir pour obtenir
 *    un accès. D'où un panneau compact, sur fond teinté, qui se lit comme des
 *    modalités plutôt que comme un voyage.
 *
 * Deux familles de mise en page pour deux réalités : c'est la forme qui dit la
 * différence, avant même le texte.
 */
import { Icon } from "@/components/ui";
import { cn } from "@/lib/utils";

const ETAPES_JEUNE = [
  { titre: "Créer son profil", detail: "Parcours, compétences, aspirations." },
  { titre: "Passer le test de validation", detail: "Le seuil OMB conditionne l'accès aux offres." },
  { titre: "Se former", detail: "CV, lettre de motivation, entretien, LinkedIn." },
  { titre: "Postuler", detail: "Aux offres publiées par les entreprises partenaires." },
] as const;

const ETAPES_ENTREPRISE = [
  { titre: "Ouvrir un compte", detail: "Présentation de l'entreprise et du recruteur." },
  { titre: "Validation OMB", detail: "Vérification avant toute publication." },
  { titre: "Publier une offre", detail: "Ciblage par filière, niveau et type de contrat." },
  { titre: "Consulter les profils", detail: "Candidats testés, formations attestées." },
] as const;

export function DoubleParcours() {
  return (
    <div className="grid gap-10 lg:grid-cols-5 lg:gap-14">
      {/* ── Jeunes : une frise, parce que c'est un cheminement ─────────── */}
      <div className="lg:col-span-3">
        <h3 className="font-headline text-2xl font-bold text-primary">Si vous cherchez un poste</h3>

        <ol className="mt-8 space-y-0">
          {ETAPES_JEUNE.map((etape, index) => (
            <li key={etape.titre} className="relative flex gap-5 pb-8 last:pb-0">
              {/*
                Le trait de liaison, tiré depuis la pastille jusqu'à la
                suivante. Absent sur le dernier jalon : une frise qui se
                poursuit dans le vide suggère une étape manquante.
              */}
              {index < ETAPES_JEUNE.length - 1 && (
                /*
                 * Le trait s'éteint vers le bas plutôt que de rester d'un gris
                 * uniforme : la frise se lit alors comme une progression qui
                 * avance, et non comme quatre puces reliées par un tuyau.
                 */
                <span
                  aria-hidden
                  className="filet-frise absolute left-[19px] top-10 h-[calc(100%-1.5rem)] w-px"
                />
              )}
              {/*
                Pastille PLEINE, et non en contour : quatre anneaux vides se
                lisent comme des cases à cocher qui restent à faire. Un jalon
                plein affirme l'étape.
              */}
              <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary font-headline font-bold text-on-primary shadow-level-1">
                {index + 1}
              </span>
              <div className="pt-1.5">
                <p className="font-semibold text-primary">{etape.titre}</p>
                <p className="text-sm text-on-surface-variant">{etape.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* ── Entreprises : un panneau, parce que c'est une procédure ────── */}
      <div className="lg:col-span-2">
        {/*
          Lavis or plutôt que le bleu de surface : le héros distingue déjà les
          deux publics par la couleur — navy plein pour la porte du jeune, or
          pour l'appel entreprise. Les deux parcours retombaient ici sur la même
          teinte, et la distinction posée en haut de page se perdait exactement
          là où elle est expliquée. Voir `.panneau-entreprise` (`globals.css`)
          pour le lavis et les contrastes mesurés.
        */}
        <div className="panneau-entreprise h-full rounded-xl p-6 sm:p-8">
          <h3 className="font-headline text-2xl font-bold text-primary">Si vous recrutez</h3>

          {/*
            Séparateurs plutôt que pastilles numérotées : la numérotation
            appartient à la frise d'à côté. La réutiliser ici recréerait
            exactement la symétrie qu'on cherche à casser.
          */}
          <ul className="mt-6 divide-y divide-outline-variant border-t border-outline-variant">
            {ETAPES_ENTREPRISE.map((etape, index) => (
              <li key={etape.titre} className="flex gap-3 py-4">
                <Icon
                  name={index === 1 ? "verified" : "check"}
                  className={cn(
                    "mt-0.5 shrink-0 text-[18px]",
                    // Seule la validation OMB est mise en avant : c'est la
                    // seule étape que l'entreprise ne contrôle pas.
                    index === 1 ? "text-secondary" : "text-on-surface-variant",
                  )}
                />
                <div>
                  <p className="font-semibold text-primary">{etape.titre}</p>
                  <p className="text-sm text-on-surface-variant">{etape.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
