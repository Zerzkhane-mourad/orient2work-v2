import type { Metadata } from "next";
import { SectionHeading } from "@/components/marketing/section-heading";
import { Card, CardBody, Icon } from "@/components/ui";
import { APP_TAGLINE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "À propos",
  description: "Orient2Work by OMB : la passerelle entre orientation, préparation et opportunités.",
};

const values = [
  { icon: "explore", title: "Orienter", desc: "Aider les jeunes à mieux se présenter et à se préparer." },
  { icon: "workspace_premium", title: "Valoriser", desc: "Mettre en avant les compétences et les expériences des talents." },
  { icon: "hub", title: "Connecter", desc: "Faciliter la mise en relation entre jeunes et entreprises." },
];

const forumPhases = [
  { title: "Avant le forum", desc: "Les étudiants créent leur profil, passent le test et suivent les formations de préparation." },
  { title: "Pendant le forum", desc: "Les entreprises consultent les profils ; les jeunes candidatent et planifient des entretiens." },
  { title: "Après le forum", desc: "L'impact se prolonge : les offres et entretiens continuent sur la plateforme." },
];

export default function AProposPage() {
  return (
    <>
      <section className="bg-surface-container py-20">
        <div className="mx-auto max-w-container-max px-margin-mobile lg:px-margin-desktop">
          <SectionHeading eyebrow="À propos" title={APP_TAGLINE} centered className="mb-6" />
          <p className="mx-auto max-w-3xl text-center text-lg text-on-surface-variant">
            Orient2Work est une plateforme lancée par OMB – OuMenBe3d dans le cadre de ses parcours
            d&apos;accompagnement des jeunes. Elle facilite la mise en relation entre jeunes talents
            et entreprises, tout en accompagnant les jeunes dans leur préparation à l&apos;insertion
            professionnelle.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-container-max px-margin-mobile py-24 lg:px-margin-desktop">
        <div className="grid gap-6 md:grid-cols-3">
          {values.map((v) => (
            <Card key={v.title} className="text-center">
              <CardBody>
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-xl bg-secondary-container text-on-secondary-container">
                  <Icon name={v.icon} className="text-3xl" />
                </div>
                <h3 className="mb-2 text-xl font-bold text-primary">{v.title}</h3>
                <p className="text-on-surface-variant">{v.desc}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-primary py-20 text-white">
        <div className="mx-auto max-w-container-max px-margin-mobile lg:px-margin-desktop">
          <h2 className="mb-12 text-center font-headline text-3xl font-bold">
            Lancement via les forums entreprises
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {forumPhases.map((p, i) => (
              <div key={p.title} className="rounded-xl bg-white/5 p-6">
                <span className="font-headline text-4xl font-bold text-secondary-fixed-dim">
                  0{i + 1}
                </span>
                <h3 className="mt-3 font-bold">{p.title}</h3>
                <p className="mt-2 text-sm text-white/70">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
