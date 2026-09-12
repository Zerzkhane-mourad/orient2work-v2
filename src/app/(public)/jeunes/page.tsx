/**
 * Page « Pour les jeunes ».
 *
 * ── Ce que ce redécoupage corrige ───────────────────────────────────────────
 *
 * 1. LA BARRIÈRE ÉTAIT À CÔTÉ DU CHEMIN. Le seuil des 80 % vivait dans un
 *    encart du héros, et l'étape 2 le redisait en prose. Deux endroits pour un
 *    seul fait, dont aucun ne le situait là où il agit. Il est désormais DANS
 *    le parcours, à l'étape où il bloque : c'est la seule étape qui s'élargit,
 *    qui prend la couleur d'accent et qui affiche le nombre. La forme dit ce
 *    que le texte disait deux fois.
 *
 * 2. LA PAGE ÉTAIT PÂLE DE BOUT EN BOUT. Héros clair, étapes claires, apports
 *    clairs, puis un unique bloc sombre tout à la fin. Un long défilement sans
 *    respiration. Les apports passent en navy : c'est le contrepoint sombre, au
 *    milieu, et il tombe sur la seule section qui parle de RÉSULTAT et non de
 *    procédure.
 *
 * 3. LE HÉROS SE DISPERSAIT. Deux colonnes, dont une portait déjà le seuil.
 *    Débarrassé de l'encart, il ne reste qu'une promesse, une phrase, un
 *    bouton. La composition n'est plus dans le héros, elle est dans la frise.
 *
 * ── La direction ────────────────────────────────────────────────────────────
 *
 * Un jeune qui arrive ici est au DÉBUT d'un chemin, et ce chemin a UNE porte.
 * La page est donc littéralement ce chemin : une frise verticale reliée, dont
 * le rythme est rompu exactement une fois, à la porte.
 *
 * ── Ce qui ne bouge pas ─────────────────────────────────────────────────────
 *
 * L'or reste réservé au seuil et au bloc de conversion. Ce dernier est or ici
 * comme sur « entreprises » : la couleur de conversion devient une règle du
 * système, pas une fantaisie par page. « Entreprises » garde sa direction
 * inverse, dense et sombre en tête.
 */
import type { Metadata } from "next";
import { Reveal } from "@/components/motion/reveal";
import { ButtonLink, Icon } from "@/components/ui";
import { QUIZ_PASS_SCORE } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pour les jeunes",
  description: "Créez votre profil, validez votre test, formez-vous et accédez aux opportunités.",
};

/**
 * Les quatre étapes.
 *
 * `porte` marque celle qui conditionne les suivantes. Un drapeau porté par la
 * DONNÉE plutôt qu'un `index === 1` codé dans le rendu : réordonner le parcours
 * ne doit pas déplacer silencieusement la mise en avant.
 */
const ETAPES: ReadonlyArray<{
  title: string;
  desc: string;
  porte?: boolean;
}> = [
  {
    title: "Créez votre compte",
    desc: "Votre parcours, vos compétences, vos aspirations. C'est ce profil que les recruteurs consulteront.",
  },
  {
    title: "Passez le test",
    desc: "Un mini-test lié à votre filière.",
    porte: true,
  },
  {
    title: "Formez-vous",
    desc: "CV, lettre de motivation, entretien, LinkedIn. Des formations certifiantes, avec une attestation à la clé.",
  },
  {
    title: "Candidatez",
    desc: "Postulez aux offres de nos entreprises partenaires et réservez vos créneaux d'entretien.",
  },
];

const APPORTS = [
  {
    icon: "badge",
    title: "Un profil qui vous valorise",
    desc: "Parcours, expériences, compétences, documents et liens réunis en un seul endroit.",
  },
  {
    icon: "verified",
    title: "Un badge de validation",
    desc: "Votre score au test rend votre profil visible et crédible auprès des entreprises.",
  },
  {
    icon: "notifications_active",
    title: "Des offres ciblées",
    desc: "Recevez une notification dès qu'une offre correspond à votre profil.",
  },
  {
    icon: "event_available",
    title: "Des entretiens simplifiés",
    desc: "Réservez un créneau et suivez l'état de vos entretiens.",
  },
] as const;

export default function JeunesPage() {
  return (
    <>
      {/*
        ── Héros : une promesse, une phrase, un bouton ──────────────────

        Trois éléments, pas six. Le retrait haut reste sous 6rem : au-delà, le
        contenu flotte à mi-hauteur et se lit comme un défaut de mise en page,
        pas comme de l'espace voulu.
      */}
      {/* Remonte sous l'en-tête sans fond : le lavis court jusqu'au haut de la
          fenêtre au lieu de laisser une bande de fond de page au-dessus. */}
      <section className="-mt-20 bg-surface-container-low pb-20 pt-40 lg:pb-24 lg:pt-44">
        <Reveal
          auChargement
          className="mx-auto max-w-container-max px-margin-mobile lg:px-margin-desktop"
        >
          <p className="font-semibold text-secondary">Pour les jeunes talents</p>
          <h1 className="mt-3 max-w-4xl font-headline text-4xl font-extrabold leading-[1.05] tracking-tight text-primary sm:text-5xl lg:text-6xl">
            Préparez votre insertion professionnelle
          </h1>
          <p className="mt-6 max-w-xl text-lg text-on-surface-variant">
            Étudiant, lauréat ou jeune diplômé : Orient2Work vous accompagne de
            l&apos;orientation à l&apos;opportunité.
          </p>
          <div className="mt-8">
            <ButtonLink href="/inscription?role=jeune" variant="secondary" size="lg">
              Créer mon profil
            </ButtonLink>
          </div>
        </Reveal>
      </section>

      {/*
        ── La frise : le parcours EST la page ───────────────────────────

        Un trait relie les jalons, et il porte le sens : chaque étape conditionne
        la suivante. Il s'arrête sous l'avant-dernier jalon, car une frise qui
        se poursuit dans le vide suggère une étape manquante.

        Le rythme est rompu UNE fois, à la porte. C'est le seul endroit de la
        page qui change de fond, de couleur et de largeur, et c'est ce qui rend
        la contrainte impossible à manquer sans avoir à la répéter en toutes
        lettres.
      */}
      <section className="mx-auto max-w-container-max px-margin-mobile py-20 lg:px-margin-desktop lg:py-24">
        <h2 className="max-w-2xl font-headline text-3xl font-bold tracking-tight text-primary lg:text-4xl">
          Quatre étapes, dans cet ordre
        </h2>

        <Reveal as="ol" cascade className="mt-12 max-w-4xl">
          {ETAPES.map((etape, index) => (
            <li key={etape.title} className="relative flex gap-5 pb-10 last:pb-0 sm:gap-8">
              {index < ETAPES.length - 1 && (
                <span
                  aria-hidden
                  className="absolute left-6 top-14 -ml-px h-[calc(100%-3.5rem)] w-0.5 bg-outline-variant"
                />
              )}

              {/*
                Pastille `aria-hidden` : l'ordre est déjà porté par le `<ol>`.
                L'annoncer une seconde fois ferait lire « 2 » avant le titre.
              */}
              <span
                aria-hidden
                className={cn(
                  "relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 font-headline text-lg font-extrabold",
                  etape.porte
                    ? "border-secondary bg-secondary-fixed text-on-secondary-fixed"
                    : "border-outline-variant bg-background text-primary",
                )}
              >
                {index + 1}
              </span>

              <div className={cn("min-w-0 flex-1", etape.porte ? "pt-0.5" : "pt-2.5")}>
                {etape.porte ? (
                  /*
                   * La porte : plus large, colorée, et portant le nombre. Le
                   * seuil n'est plus une phrase parmi d'autres, c'est un
                   * obstacle qu'on voit avant de le lire.
                   */
                  <div className="rounded-xl bg-secondary-fixed p-6 text-on-secondary-fixed sm:p-8">
                    <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
                      <h3 className="font-headline text-2xl font-bold">{etape.title}</h3>
                      <p className="font-headline text-4xl font-extrabold leading-none tracking-tight">
                        {QUIZ_PASS_SCORE}
                        <span className="align-super text-[0.4em]">%</span>
                      </p>
                    </div>
                    <p className="mt-3 max-w-xl text-on-secondary-fixed-variant">
                      {etape.desc} Tant que ce score n&apos;est pas atteint, votre profil
                      n&apos;est pas transmis aux recruteurs. Les formations sont là pour vous y
                      amener, et le test se repasse.
                    </p>
                  </div>
                ) : (
                  <>
                    <h3 className="font-headline text-2xl font-bold text-primary">
                      {etape.title}
                    </h3>
                    <p className="mt-2 max-w-xl text-on-surface-variant">{etape.desc}</p>
                  </>
                )}
              </div>
            </li>
          ))}
        </Reveal>
      </section>

      {/*
        ── Les apports, sur fond sombre ─────────────────────────────────

        Le contrepoint qui manquait. La page enchaînait trois sections pâles
        avant son unique bloc sombre ; celui-ci arrive au milieu, et il tombe
        sur la seule section qui parle de RÉSULTAT plutôt que de procédure.

        Deux colonnes largement espacées, sans filets : la frise juste au-dessus
        est déjà une structure réglée, en remettre ici donnerait deux dispositifs
        identiques à la suite. Le blanc sépare, un court tiret or ouvre.
      */}
      <section className="bg-primary py-20 text-white lg:py-24">
        <div className="mx-auto max-w-container-max px-margin-mobile lg:px-margin-desktop">
          <h2 className="max-w-2xl font-headline text-3xl font-bold tracking-tight lg:text-4xl">
            Ce que la plateforme vous apporte
          </h2>

          <Reveal as="dl" cascade className="mt-12 grid gap-x-16 gap-y-12 sm:grid-cols-2">
            {APPORTS.map((apport) => (
              <div key={apport.title}>
                <dt>
                  <span aria-hidden className="block h-0.5 w-7 rounded-full bg-secondary-fixed-dim" />
                  <span className="mt-4 flex items-center gap-3 font-headline text-xl font-bold">
                    <Icon
                      name={apport.icon}
                      className="shrink-0 text-[22px] text-secondary-fixed-dim"
                    />
                    {apport.title}
                  </span>
                </dt>
                <dd className="mt-2 max-w-md text-white/70">{apport.desc}</dd>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/*
        ── L'appel final ────────────────────────────────────────────────

        Or, comme sur « entreprises » : le bloc de conversion porte la même
        couleur sur les deux pages. C'est une règle du système, pas une
        fantaisie de page. `secondary-fixed` / `on-secondary-fixed` donne
        13,3:1, et le bouton navy dessus 12,8:1.
      */}
      <section className="bg-secondary-fixed py-16 text-on-secondary-fixed lg:py-20">
        <div className="mx-auto flex max-w-container-max flex-col gap-8 px-margin-mobile lg:flex-row lg:items-center lg:justify-between lg:px-margin-desktop">
          <div>
            <h2 className="font-headline text-3xl font-extrabold tracking-tight sm:text-4xl">
              Commencez par votre profil
            </h2>
            <p className="mt-3 max-w-xl text-on-secondary-fixed-variant">
              La création de compte, le test et les formations sont gratuits. Vous pouvez
              repasser le test autant de fois qu&apos;il le faut.
            </p>
          </div>
          <ButtonLink
            href="/inscription?role=jeune"
            variant="primary"
            size="lg"
            className="shrink-0"
          >
            Créer mon profil
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
