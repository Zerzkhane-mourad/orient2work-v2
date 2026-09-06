/**
 * Page « Pour les entreprises ».
 *
 * ── La direction retenue : DOSSIER ──────────────────────────────────────────
 *
 * Un recruteur n'est pas en promenade. Il vient vérifier une chose — « à quoi
 * ai-je accès, et à quelles conditions » — et il la vérifie vite. La page doit
 * donc être DENSE et se laisser balayer, à l'opposé exact de la page « jeunes »
 * qui, elle, prend son temps.
 *
 *  • Les quatre étapes quittent le héros pour une section à elles, placée
 *    APRÈS les arguments : « comment je commence » ne se demande qu'une fois
 *    convaincu. Elles y forment une frise à filets, non quatre boîtes
 *    translucides à `backdrop-blur` — un effet de matière coûteux au rendu, et
 *    quatre objets là où il n'y a qu'une procédure.
 *  • Les arguments deviennent une FICHE TECHNIQUE : des rangées pleine largeur,
 *    le terme à gauche, ce qu'il recouvre à droite. On balaie la colonne de
 *    gauche, on s'arrête sur la ligne qui compte.
 *  • Le chiffre qui compte — le seuil du test — est le seul élément qui
 *    s'autorise une grande taille, parce que c'est le seul argument que le
 *    recruteur ne peut pas déduire du reste.
 *
 * ── Corrigé au passage ──────────────────────────────────────────────────────
 *
 *  • Le surtitre était en CAPITALES espacées. Il ouvrait la page sur le même
 *    petit label que partout ailleurs ; en casse normale, il redevient une
 *    phrase.
 *  • Deux appels à l'action de poids égal — « Créer un compte » et « Nous
 *    contacter » — se disputaient le clic. Le second redevient un lien : une
 *    entreprise qui veut parler à quelqu'un le cherche, elle n'a pas besoin
 *    qu'on le lui propose au même volume que l'inscription.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/motion/reveal";
import { ButtonLink, Icon } from "@/components/ui";
import { QUIZ_PASS_SCORE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Pour les entreprises",
  description: "Publiez vos offres, consultez des profils vérifiés et gérez vos entretiens.",
};

const ETAPES = [
  {
    title: "Créez votre compte",
    desc: "Présentez votre entreprise, votre secteur et votre responsable RH.",
  },
  {
    title: "Validation par OMB",
    desc: "Nos équipes vérifient votre identité et activent votre espace.",
  },
  {
    title: "Publiez une offre",
    desc: "Décrivez le poste, le profil recherché et les compétences requises.",
  },
  {
    title: "Consultez les talents",
    desc: "Filtrez des profils pré-qualifiés et testés, puis planifiez des entretiens.",
  },
] as const;

const ARGUMENTS = [
  {
    icon: "fact_check",
    title: "Des profils vérifiés",
    desc: "Chaque jeune valide un test lié à sa filière avant d'être visible.",
  },
  {
    icon: "filter_alt",
    title: "Un tri efficace",
    desc: "Filtrez par ville, filière, niveau, compétences, langue et expérience.",
  },
  {
    icon: "calendar_month",
    title: "Un calendrier intégré",
    desc: "Définissez vos créneaux ; les jeunes réservent, vous confirmez.",
  },
  {
    icon: "insights",
    title: "Un accompagnement OMB",
    desc: "Bénéficiez du réseau des forums entreprises et écoles supérieures.",
  },
] as const;

export default function EntreprisesPage() {
  return (
    <>
      <section className="champ-heros champ-heros-gauche py-20 text-white lg:py-24">
        <div className="mx-auto grid max-w-container-max gap-12 px-margin-mobile lg:grid-cols-12 lg:gap-16 lg:px-margin-desktop">
          <Reveal auChargement className="lg:col-span-6">
            <p className="font-semibold text-secondary-fixed-dim">Pour les entreprises</p>
            <h1 className="mt-3 font-headline text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl">
              Recrutez des talents sérieux et bien préparés
            </h1>
            <p className="mt-6 max-w-lg text-lg text-white/70">
              Gagnez du temps dans la recherche et la qualification des candidats. Accédez à des
              profils vérifiés, motivés et formés à l&apos;employabilité.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-6">
              <ButtonLink href="/inscription?role=entreprise" variant="secondary" size="lg">
                Créer un compte entreprise
              </ButtonLink>
              <Link
                href="/contact"
                className="font-semibold text-white underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
              >
                Nous contacter
              </Link>
            </div>
          </Reveal>

          {/*
            ── Le héros ne garde qu'une seule chose à droite ──────────────

            Il en portait six : surtitre, titre, sous-titre, un grand chiffre,
            un bouton, un lien, PLUS la procédure en quatre étapes. Le chiffre
            s'intercalait entre le sous-titre et le bouton et repoussait l'appel
            à l'action très bas ; la procédure, elle, répond à « comment je
            commence » — une question qu'on ne se pose qu'une fois convaincu.
            Elle est donc descendue dans sa propre section.

            Reste le seuil : la seule chose qu'un recruteur ne peut pas deviner,
            et l'argument qui justifie tout le reste. Bordure à 35 % et non
            25 % — en dessous, le cadre tombe sous les 3:1 attendus d'un
            contour sur fond sombre.
          */}
          <Reveal auChargement delai={0.12} className="lg:col-span-5 lg:col-start-8 lg:mt-6">
            <aside className="rounded-xl border border-white/35 p-8">
            <p className="font-headline text-6xl font-extrabold leading-none tracking-tight text-secondary-fixed-dim">
              {QUIZ_PASS_SCORE}
              <span className="align-super text-[0.4em]">%</span>
            </p>
            <p className="mt-4 font-headline text-xl font-bold">Le filtre est déjà passé</p>
            <p className="mt-2 text-sm text-white/70">
              C&apos;est le score minimum exigé d&apos;un jeune pour que son profil vous soit
                transmis. Aucun candidat ne vous parvient sans l&apos;avoir atteint.
              </p>
            </aside>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-container-max px-margin-mobile py-20 lg:px-margin-desktop lg:py-24">
        <h2 className="max-w-2xl font-headline text-3xl font-bold tracking-tight text-primary lg:text-4xl">
          Pourquoi recruter sur Orient2Work ?
        </h2>

        {/*
          ── Une fiche technique, pas une grille ──────────────────────────

          C'était une grille 2×2 : quatre pavés de même poids, l'œil devant
          choisir par où entrer. Or ces quatre points ne sont pas des options
          entre lesquelles arbitrer, ce sont les CARACTÉRISTIQUES d'une seule
          offre — et une caractéristique se lit sur une ligne : le nom à
          gauche, ce qu'il recouvre à droite.

          Des rangées pleine largeur donc, terme à gauche sur quatre colonnes,
          définition à droite sur huit, séparées d'un filet. On les balaie
          verticalement en lisant la seule colonne de gauche, puis on s'arrête
          sur celle qui compte. C'est le geste d'un recruteur pressé, et c'est
          la raison d'être de la direction « dossier » de cette page.

          `sm:grid-cols-12` sur le `<div>` de chaque paire, et non sur le
          `<dl>` : un `dt` et un `dd` séparés par la grille perdraient leur
          association pour les technologies d'assistance.
        */}
        <Reveal as="dl" cascade className="mt-12 divide-y divide-outline-variant">
          {ARGUMENTS.map((argument) => (
            <div key={argument.title} className="gap-8 py-7 sm:grid sm:grid-cols-12 sm:items-baseline">
              <dt className="flex items-center gap-3 font-headline text-lg font-bold text-primary sm:col-span-4">
                <Icon name={argument.icon} className="shrink-0 text-[22px] text-secondary" />
                {argument.title}
              </dt>
              <dd className="mt-2 text-on-surface-variant sm:col-span-8 sm:mt-0">
                {argument.desc}
              </dd>
            </div>
          ))}
        </Reveal>
      </section>

      {/*
        ── La procédure, descendue du héros ──────────────────────────────

        « Comment je commence » n'est pas une question d'accroche : on ne se la
        pose qu'après avoir été convaincu. La procédure suit donc les arguments,
        et précède immédiatement le bouton — c'est l'ordre dans lequel un
        recruteur décide.

        Quatre colonnes de même largeur, ce qui serait un défaut pour des
        arguments — ils ne se valent pas — et qui est ici JUSTE : ce sont des
        étapes successives et obligatoires, elles ont bien le même poids. Un
        filet en tête de chaque colonne, aucun encadré : une frise, pas quatre
        cartes.
      */}
      <section className="border-t border-outline-variant bg-surface-container-low py-20 lg:py-24">
        <div className="mx-auto max-w-container-max px-margin-mobile lg:px-margin-desktop">
          <h2 className="max-w-2xl font-headline text-3xl font-bold tracking-tight text-primary lg:text-4xl">
            Comment ça se passe
          </h2>
          <Reveal as="ol" cascade className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {ETAPES.map((etape) => (
              <li key={etape.title} className="border-t-2 border-outline-variant pt-5">
                <h3 className="font-headline text-lg font-bold text-primary">{etape.title}</h3>
                <p className="mt-2 text-sm text-on-surface-variant">{etape.desc}</p>
              </li>
            ))}
          </Reveal>
        </div>
      </section>

      {/*
        ── L'appel final ─────────────────────────────────────────────────

        La page s'arrêtait sur le dernier argument. Le seul bouton était dans le
        héros, donc hors écran depuis longtemps : le visiteur le plus engagé —
        celui qui a tout lu — arrivait au bout sans rien à cliquer.

        Champ OR, et non navy. Le héros est déjà navy : refermer sur du navy
        aurait donné deux blocs sombres identiques aux deux bouts, et le milieu
        clair aurait ressemblé à un creux entre eux. L'or ferme sur une couleur
        que la page n'a pas encore employée en aplat.

        C'est aussi le miroir de « jeunes », qui commence par l'or et finit sur
        le navy. Chaque page emploie chaque couleur une fois, dans l'ordre
        inverse de l'autre.
      */}
      <section className="bg-secondary-fixed py-16 text-on-secondary-fixed lg:py-20">
        <div className="mx-auto flex max-w-container-max flex-col gap-8 px-margin-mobile lg:flex-row lg:items-center lg:justify-between lg:px-margin-desktop">
          <div>
            <h2 className="font-headline text-3xl font-extrabold tracking-tight sm:text-4xl">
              Ouvrez votre espace recruteur
            </h2>
            <p className="mt-3 max-w-xl text-on-secondary-fixed-variant">
              La validation par OMB prend quelques jours. Vous publiez vos offres dès
              qu&apos;elle est prononcée.
            </p>
          </div>
          {/* Bouton navy sur l'or : la pastille or habituelle s'y dissoudrait. */}
          <ButtonLink
            href="/inscription?role=entreprise"
            variant="primary"
            size="lg"
            className="shrink-0"
          >
            Créer un compte entreprise
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
