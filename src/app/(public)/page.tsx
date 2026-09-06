import { ButtonLink } from "@/components/ui";
import { Reveal } from "@/components/motion/reveal";
import { BandeConfiance } from "@/features/home/bande-confiance";
import { CategoriesSection } from "@/features/home/categories-section";
import { DoubleParcours } from "@/features/home/double-parcours";
import { FaqSection } from "@/features/home/faq-section";
import { HeroDeuxPortes } from "@/features/home/hero-deux-portes";
import { TrioChiffres } from "@/features/home/trio-chiffres";
import { TemoignagesSection } from "@/features/home/temoignages-section";
import { serverFetch } from "@/lib/api/client";
import type { ApiFaq, ApiTemoignage } from "@/lib/api/types";


/**
 * Lectures publiques côté serveur : aucune session n'est nécessaire, et le cache
 * de 60 s de `serverFetch` évite de solliciter l'API à chaque visite.
 *
 * Chaque `catch` garde la page debout si l'API est indisponible : la section
 * concernée disparaît, le reste s'affiche.
 */
async function loadTemoignages(): Promise<ApiTemoignage[]> {
  // Vrais avis de la base : la vitrine ne fabrique pas de témoignages.
  return serverFetch<ApiTemoignage[]>("/formations/temoignages").catch(() => []);
}

/** Questions saisies au back-office, dans l'ordre voulu par l'administrateur. */
async function loadFaq(): Promise<ApiFaq[]> {
  return serverFetch<ApiFaq[]>("/faq").catch(() => []);
}

/**
 * En-tête de section.
 *
 * SANS surtitre : le petit label en capitales posé au-dessus de chaque titre
 * produit le rythme répétitif qui trahit une page composée à la chaîne, et la
 * position de la section suffit à la situer. Le titre porte seul.
 */
function EnTeteSection({ titre, soustitre }: { titre: string; soustitre?: string }) {
  return (
    /* `text-balance` : le navigateur répartit lui-même les mots entre les
       lignes, au lieu de laisser un titre de deux lignes se terminer sur un mot
       isolé. Gratuit, et c'est ce qui distingue un titre composé d'un titre
       simplement coupé. */
    <Reveal className="mb-8 max-w-2xl space-y-2">
      <h2 className="text-balance font-headline text-3xl font-bold tracking-tight text-primary">
        {titre}
      </h2>
      {soustitre && <p className="text-pretty text-on-surface-variant">{soustitre}</p>}
    </Reveal>
  );
}

/**
 * Page d'accueil publique.
 *
 * Reste un SERVER COMPONENT : les données sont lues côté serveur et la page est
 * prérendue avec son contenu réel, ce qui compte pour l'indexation. Seules les
 * enveloppes d'animation (`Reveal`, `CompteurAnime`) sont clientes ; elles ne
 * portent aucune donnée, uniquement le mouvement.
 *
 * Conséquence à ne pas perdre de vue : le HTML rendu par le serveur est COMPLET
 * et VISIBLE. L'état initial des animations est posé par GSAP au moment de
 * s'exécuter, jamais par une classe `opacity-0` - sans quoi la page
 * apparaîtrait vide à qui n'exécute pas le script.
 *
 * Rythme des fonds, voulu : sombre (héros), clair (chiffres), sombre
 * (confiance), puis alternance claire jusqu'à la bande d'appel finale. Deux
 * blocs sombres consécutifs écraseraient le chiffre monumental de la section
 * confiance, qui est le point culminant de la page.
 */
export default async function HomePage() {
  // Les deux lectures sont indépendantes : les enchaîner ferait attendre la
  // page pour rien.
  const [temoignages, questions] = await Promise.all([loadTemoignages(), loadFaq()]);

  return (
    <>
      {/* Le premier avis alimente la micro-carte flottante du héros : du
          contenu réel plutôt qu'un faux message décoratif. */}
      <HeroDeuxPortes {...(temoignages[0] ? { temoignage: temoignages[0] } : {})} />

      {/* Chiffres : deux cartes claires et une sombre, comme dans la référence */}
      <section className="mx-auto max-w-container-max px-margin-mobile py-14 lg:px-margin-desktop lg:py-16">
        <Reveal cascade>
          <TrioChiffres />
        </Reveal>
      </section>

      <BandeConfiance />

      {/* Catégories : première porte vers le catalogue */}
      <section className="mx-auto max-w-container-max px-margin-mobile py-16 lg:px-margin-desktop lg:py-20">
        <EnTeteSection
          titre="Quel type d'opportunité cherchez-vous ?"
          soustitre="Six entrées vers le catalogue, sans passer par la recherche."
        />
        <Reveal cascade>
          <CategoriesSection />
        </Reveal>
      </section>

      {/* Double parcours */}
      <section className="border-y border-outline-variant bg-surface-container-low py-16 lg:py-20">
        <div className="mx-auto max-w-container-max px-margin-mobile lg:px-margin-desktop">
          <EnTeteSection
            titre="Deux parcours, deux rythmes"
            soustitre="Ce que vous avez à faire dépend du côté d'où vous arrivez."
          />
          <DoubleParcours />
        </div>
      </section>

      {/* Témoignages */}
      {temoignages.length > 0 && (
        <section className="px-2 py-8 sm:px-4">
          {/*
            Les témoignages sur un champ dégradé, comme dans la référence : le
            passage d'un fond plat à une lumière signale que la page change de
            registre - on quitte l'argumentaire pour la parole des utilisateurs.
          */}
          <div className="champ-degrade-clair rounded-xl px-margin-mobile py-16 sm:rounded-[1.75rem] lg:px-12 lg:py-20">
            <div className="mx-auto max-w-container-max">
              <EnTeteSection
                titre="Ce qu'en disent les candidats"
                soustitre="Des avis laissés après une formation suivie jusqu'au bout."
              />
              <TemoignagesSection temoignages={temoignages} />
            </div>
          </div>
        </section>
      )}

      {/*
        FAQ : la dernière levée d'objection avant l'appel final. Elle disparaît
        entièrement si le back-office n'a rien saisi — une rubrique « questions
        fréquentes » vide en dit plus long qu'une absence de rubrique.
      */}
      {questions.length > 0 && (
        <section className="mx-auto max-w-container-max px-margin-mobile py-16 lg:px-margin-desktop lg:py-20">
          <Reveal>
            <FaqSection questions={questions} />
          </Reveal>
        </section>
      )}

      {/* Forums : panneau dégradé, le point final de la page */}
      <section className="px-2 pb-2 sm:px-4 sm:pb-4">
        <Reveal className="champ-degrade relative overflow-hidden rounded-xl px-margin-mobile py-16 text-center text-white sm:rounded-[1.75rem] lg:py-20">
          <div className="relative mx-auto max-w-2xl">
            <h2 className="text-balance font-headline text-3xl font-extrabold tracking-tight sm:text-4xl">
              Forums Entreprises &amp; Écoles Supérieures
            </h2>
            <p className="mt-3 text-white/75">
              Rencontrez nos partenaires académiques et les entreprises qui recrutent, en
              présentiel.
            </p>
            <div className="mt-8">
              <ButtonLink href="/a-propos" variant="secondary" size="lg">
                Découvrir le calendrier
              </ButtonLink>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
