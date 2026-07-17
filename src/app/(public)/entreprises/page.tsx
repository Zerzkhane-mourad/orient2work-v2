import type { Metadata } from "next";
import { SectionHeading } from "@/components/marketing/section-heading";
import { ButtonLink, Card, CardBody, Icon } from "@/components/ui";

export const metadata: Metadata = {
  title: "Pour les entreprises",
  description: "Publiez vos offres, consultez des profils vérifiés et gérez vos entretiens.",
};

const steps = [
  { icon: "domain_add", title: "Créez votre compte", desc: "Présentez votre entreprise, votre secteur et votre responsable RH." },
  { icon: "verified_user", title: "Validation par OMB", desc: "Nos équipes vérifient votre identité et activent votre espace." },
  { icon: "post_add", title: "Publiez une offre", desc: "Décrivez le poste, le profil recherché et les compétences requises." },
  { icon: "groups", title: "Consultez les talents", desc: "Filtrez des profils pré-qualifiés et testés, puis planifiez des entretiens." },
];

const benefits = [
  { icon: "fact_check", title: "Des profils vérifiés", desc: "Chaque jeune valide un test lié à sa filière avant d'être visible." },
  { icon: "filter_alt", title: "Un tri efficace", desc: "Filtrez par ville, filière, niveau, compétences, langue et expérience." },
  { icon: "calendar_month", title: "Un calendrier intégré", desc: "Définissez vos créneaux ; les jeunes réservent, vous confirmez." },
  { icon: "insights", title: "Un accompagnement OMB", desc: "Bénéficiez du réseau des forums entreprises et écoles supérieures." },
];

export default function EntreprisesPage() {
  return (
    <>
      <section className="bg-primary py-20 text-white">
        <div className="mx-auto grid max-w-container-max items-center gap-12 px-margin-mobile lg:grid-cols-2 lg:px-margin-desktop">
          <div className="space-y-6">
            <span className="text-sm font-bold uppercase tracking-widest text-secondary-fixed-dim">
              Pour les entreprises
            </span>
            <h1 className="font-headline text-4xl font-bold leading-tight lg:text-5xl">
              Recrutez des talents sérieux et bien préparés
            </h1>
            <p className="max-w-lg text-lg text-white/70">
              Gagnez du temps dans la recherche et la qualification des candidats. Accédez à des
              profils vérifiés, motivés et formés à l&apos;employabilité.
            </p>
            <div className="flex flex-wrap gap-4">
              <ButtonLink href="/inscription?role=entreprise" variant="secondary" size="lg">
                Créer un compte entreprise
              </ButtonLink>
              <ButtonLink href="/contact" variant="outline" size="lg" className="border-white text-white hover:bg-white/10">
                Nous contacter
              </ButtonLink>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {steps.map((s, i) => (
              <div key={s.title} className="rounded-xl bg-white/5 p-5 backdrop-blur">
                <Icon name={s.icon} className="mb-3 text-3xl text-secondary-fixed-dim" />
                <h4 className="font-bold">
                  {i + 1}. {s.title}
                </h4>
                <p className="mt-1 text-sm text-white/70">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-container-max px-margin-mobile py-24 lg:px-margin-desktop">
        <SectionHeading centered title="Pourquoi recruter sur Orient2Work ?" className="mb-14" />
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
