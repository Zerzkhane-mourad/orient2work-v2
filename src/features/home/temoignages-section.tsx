/**
 * Preuve sociale de la page d'accueil.
 *
 * La page affirmait « 5000+ jeunes inscrits » sans jamais donner la parole à un
 * seul d'entre eux. Un chiffre s'oublie ; une phrase de quelqu'un qui a suivi
 * la formation reste.
 *
 * ── Origine de la mise en page ──────────────────────────────────────────────
 *
 * Structure éditoriale reprise du composant « Testimonial Basic » de 21st.dev
 * (uilayout.contact) : lignes alternées, bloc auteur détaché de la citation,
 * note en étoiles. Tout le reste a été REFAIT :
 *
 *  • jetons — l'original arrive en `bg-muted` / `text-foreground` / `border-border`,
 *    vocabulaire shadcn absent de cette application ;
 *  • polices — `font-dmSans` et `font-manrope` n'y existent pas ;
 *  • icônes — `lucide-react` n'est pas une dépendance du projet ;
 *  • vignettes vidéo — il n'y a pas de vidéos, la colonne a été remplacée par
 *    la citation elle-même ;
 *  • contenu — les trois témoignages livrés étaient FICTIFS. Ceux-ci viennent
 *    de la base, via `GET /formations/temoignages`.
 *
 * Composant SERVEUR : il ne reçoit que des données déjà chargées. Seule
 * l'enveloppe d'animation bascule côté client.
 */
import { Icon, StarRating } from "@/components/ui";
import { Reveal } from "@/components/motion/reveal";
import type { ApiTemoignage } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/** « Amina E. » → « AE ». Les photos d'auteur vivent sur une route protégée. */
function initiales(nom: string): string {
  return nom
    .split(/\s+/)
    .map((mot) => mot.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function TemoignagesSection({ temoignages }: { temoignages: ApiTemoignage[] }) {
  // Rien à montrer : la section disparaît plutôt que d'afficher un cadre vide.
  if (temoignages.length === 0) return null;

  return (
    <div className="divide-y divide-outline-variant border-y border-outline-variant">
      {temoignages.map((t, index) => (
        <Reveal key={t.id} className="grid gap-6 py-10 lg:grid-cols-12 lg:gap-10">
          {/*
            Lignes alternées : l'auteur passe à droite une fois sur deux. Sur
            petit écran l'ordre reste celui de la lecture — auteur, puis propos.
          */}
          <div
            className={cn(
              "lg:col-span-4",
              index % 2 === 1 && "lg:order-last lg:text-right",
            )}
          >
            <div
              className={cn(
                "flex items-center gap-3",
                index % 2 === 1 && "lg:flex-row-reverse lg:text-left",
              )}
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-surface-container font-headline text-lg font-bold text-primary">
                {initiales(t.auteurNom)}
              </span>
              <div className="min-w-0">
                <p className="font-headline text-lg font-bold text-primary">{t.auteurNom}</p>
                <p className="truncate text-sm text-on-surface-variant">
                  A suivi « {t.formation.titre} »
                </p>
              </div>
            </div>
          </div>

          <blockquote className="lg:col-span-8">
            {/* Guillemet en filigrane : il signale une citation sans ajouter de
                ponctuation à lire. */}
            <Icon
              name="format_quote"
              className="mb-1 text-4xl text-secondary-container"
              aria-hidden
            />
            <p className="text-xl font-medium leading-snug text-on-surface sm:text-2xl">
              {t.commentaire}
            </p>
            <div className="mt-4">
              <StarRating value={t.note} showValue={false} />
            </div>
          </blockquote>
        </Reveal>
      ))}
    </div>
  );
}
