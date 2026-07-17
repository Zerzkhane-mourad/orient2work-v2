import type { Metadata } from "next";
import { SectionHeading } from "@/components/marketing/section-heading";
import { ButtonLink, Card, CardBody, Icon } from "@/components/ui";
import { QUIZ_PASS_SCORE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Pour les jeunes",
  description: "Créez votre profil, validez votre test, formez-vous et accédez aux opportunités.",
};

const journey = [
  { icon: "person_add", title: "Créez votre compte", desc: "Renseignez vos informations et complétez votre profil professionnel." },
  { icon: "quiz", title: "Passez le test", desc: `Un mini-test lié à votre filière. ${QUIZ_PASS_SCORE}% pour valider votre compte.` },
  { icon: "school", title: "Formez-vous", desc: "Accédez à des formations certifiantes sur l'employabilité." },
  { icon: "work", title: "Candidatez", desc: "Postulez aux offres et demandez des entretiens en un clic." },
];

const benefits = [
  { icon: "badge", title: "Un profil qui vous valorise", desc: "Parcours, expériences, compétences, documents et liens réunis en un seul endroit." },
  { icon: "verified", title: "Un badge de validation", desc: "Votre score au test rend votre profil visible et crédible auprès des entreprises." },
  { icon: "notifications_active", title: "Des offres ciblées", desc: "Recevez une notification dès qu'une offre correspond à votre profil." },
  { icon: "event_available", title: "Des entretiens simplifiés", desc: "Réservez un créneau et suivez l'état de vos entretiens." },
];

export default function JeunesPage() {
  return (
    <>
      <section className="bg-surface-container py-20">
        <div className="mx-auto grid max-w-container-max items-center gap-12 px-margin-mobile lg:grid-cols-2 lg:px-margin-desktop">
          <div className="space-y-6">
            <SectionHeading
              eyebrow="Pour les jeunes talents"
              title="Préparez votre insertion professionnelle"
              subtitle="Étudiant, lauréat, jeune diplômé ou en recherche d'une première expérience : Orient2Work vous accompagne de l'orientation à l'opportunité."
            />
            <div className="flex flex-wrap gap-4">
              <ButtonLink href="/inscription?role=jeune" variant="secondary" size="lg">
                Créer mon profil
              </ButtonLink>
              <ButtonLink href="/formations" variant="outline" size="lg">
                Voir les formations
              </ButtonLink>
            </div>
          </div>
          <Card className="p-8">
            <ol className="space-y-6">
              {journey.map((step, i) => (
                <li key={step.title} className="flex gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
                    <Icon name={step.icon} />
                  </span>
                  <div>
                    <h4 className="font-bold text-primary">
                      {i + 1}. {step.title}
                    </h4>
                    <p className="text-sm text-on-surface-variant">{step.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-container-max px-margin-mobile py-24 lg:px-margin-desktop">
        <SectionHeading centered title="Ce que la plateforme vous apporte" className="mb-14" />
        <div className="grid gap-6 md:grid-cols-2">
          {benefits.map((b) => (
            <Card key={b.title}>
              <CardBody className="flex gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-container text-primary">
                  <Icon name={b.icon} className="text-2xl" />
                </span>
                <div>
                  <h3 className="mb-1 font-bold text-primary">{b.title}</h3>
                  <p className="text-on-surface-variant">{b.desc}</p>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}
