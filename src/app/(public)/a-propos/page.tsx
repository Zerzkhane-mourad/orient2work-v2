/**
 * Page « À propos ».
 *
 * Même grammaire que « jeunes » et « entreprises » : héros clair ferré à
 * gauche, sections claires, UN contrepoint navy au milieu, et le bloc de
 * conversion or pour finir. La couleur de conversion reste une règle du
 * système, pas un choix de page.
 *
 * Le contrepoint navy porte les forums : c'est la seule section qui raconte
 * l'histoire d'OMB plutôt que les fonctionnalités de la plateforme.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeading } from "@/components/marketing/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { ButtonLink, Icon } from "@/components/ui";
import { TrioChiffres } from "@/features/home/trio-chiffres";
import { APP_TAGLINE } from "@/lib/constants";

const DESCRIPTION =
  "Orient2Work by OMB : la passerelle entre orientation, préparation et opportunités.";

export const metadata: Metadata = {
  title: "À propos",
  description: DESCRIPTION,
  openGraph: { title: "À propos | Orient2Work by OMB", description: DESCRIPTION },
};

const VALEURS = [
  {
    icon: "explore",
    title: "Orienter",
    desc: "Aider les jeunes à mieux se présenter et à se préparer.",
  },
  {
    icon: "workspace_premium",
    title: "Valoriser",
    desc: "Mettre en avant les compétences et les expériences des talents.",
  },
  {
    icon: "hub",
    title: "Connecter",
    desc: "Faciliter la mise en relation entre jeunes et entreprises.",
  },
] as const;

const PHASES_FORUM = [
  {
    title: "Avant le forum",
    desc: "Les étudiants créent leur profil, passent le test et suivent les formations de préparation.",
  },
  {
    title: "Pendant le forum",
    desc: "Les entreprises consultent les profils ; les jeunes candidatent et planifient des entretiens.",
  },
  {
    title: "Après le forum",
    desc: "L'impact se prolonge : les offres et entretiens continuent sur la plateforme.",
  },
] as const;

export default function AProposPage() {
  return (
    <>
      {/* Remonte sous l'en-tête sans fond : le lavis court jusqu'au haut de la
          fenêtre au lieu de laisser une bande de fond de page au-dessus. */}
      <section className="-mt-20 bg-surface-container-low pb-20 pt-40 lg:pb-24 lg:pt-44">
        <Reveal
          auChargement
          className="mx-auto max-w-container-max px-margin-mobile lg:px-margin-desktop"
        >
          <p className="font-semibold text-secondary">À propos d&apos;Orient2Work</p>
          <h1 className="mt-3 max-w-4xl text-balance font-headline text-4xl font-extrabold leading-[1.05] tracking-tight text-primary sm:text-5xl lg:text-6xl">
            {APP_TAGLINE}
          </h1>
          <p className="mt-6 max-w-2xl text-pretty text-lg text-on-surface-variant">
            Orient2Work est une plateforme lancée par OMB – OuMenBe3d dans le cadre de ses parcours
            d&apos;accompagnement des jeunes. Elle facilite la mise en relation entre jeunes talents
            et entreprises, tout en accompagnant les jeunes dans leur préparation à l&apos;insertion
            professionnelle.
          </p>
        </Reveal>
      </section>

      {/* Trois verbes, trois colonnes à filet or : une liste de définitions,
          pas trois cartes de même poids qui se disputent le regard. */}
      <section className="mx-auto max-w-container-max px-margin-mobile py-20 lg:px-margin-desktop lg:py-24">
        <SectionHeading
          title="Notre mission tient en trois verbes"
          subtitle="Ce que la plateforme fait pour les jeunes, et ce qu'elle rend possible pour les entreprises."
        />
        <Reveal as="dl" cascade className="grid gap-x-12 gap-y-10 md:grid-cols-3">
          {VALEURS.map((valeur) => (
            <div key={valeur.title}>
              <dt>
                <span aria-hidden className="block h-0.5 w-7 rounded-full bg-secondary" />
                <span className="mt-4 flex items-center gap-3 font-headline text-xl font-bold text-primary">
                  <Icon name={valeur.icon} className="shrink-0 text-[22px] text-secondary" />
                  {valeur.title}
                </span>
              </dt>
              <dd className="mt-2 max-w-sm text-on-surface-variant">{valeur.desc}</dd>
            </div>
          ))}
        </Reveal>
      </section>

      <section className="mx-auto max-w-container-max px-margin-mobile pb-20 lg:px-margin-desktop lg:pb-24">
        <TrioChiffres />
      </section>

      {/* Le contrepoint navy, au milieu. Les phases sont une procédure : même
          frise à filets que sur « entreprises », pas trois boîtes. */}
      <section className="bg-primary py-20 text-white lg:py-24">
        <div className="mx-auto max-w-container-max px-margin-mobile lg:px-margin-desktop">
          <h2 className="max-w-2xl text-balance font-headline text-3xl font-bold tracking-tight sm:text-4xl">
            Lancement via les forums entreprises
          </h2>
          <p className="mt-3 max-w-2xl text-pretty text-lg text-white/70">
            La plateforme prolonge les forums Entreprises &amp; Écoles Supérieures organisés par OMB.
          </p>
          <Reveal as="ol" cascade className="mt-12 grid gap-x-8 gap-y-10 md:grid-cols-3">
            {PHASES_FORUM.map((phase, index) => (
              <li key={phase.title} className="border-t-2 border-white/25 pt-5">
                <span
                  aria-hidden
                  className="font-headline text-4xl font-extrabold leading-none text-secondary-fixed-dim"
                >
                  0{index + 1}
                </span>
                <h3 className="mt-4 font-headline text-xl font-bold">{phase.title}</h3>
                <p className="mt-2 text-white/70">{phase.desc}</p>
              </li>
            ))}
          </Reveal>
        </div>
      </section>

      
      <section className="bg-secondary-fixed py-16 text-on-secondary-fixed lg:py-20">
        <div className="mx-auto flex max-w-container-max flex-col gap-8 px-margin-mobile lg:flex-row lg:items-center lg:justify-between lg:px-margin-desktop">
          <div>
            <h2 className="font-headline text-3xl font-extrabold tracking-tight sm:text-4xl">
              Rejoignez Orient2Work
            </h2>
            <p className="mt-3 max-w-xl text-on-secondary-fixed-variant">
              La création de compte est gratuite. Vous recrutez ?{" "}
              <Link
                href="/entreprises"
                className="font-semibold text-on-secondary-fixed underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Découvrez l&apos;espace entreprises
              </Link>
              .
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
