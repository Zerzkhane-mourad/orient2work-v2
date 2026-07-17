import { ButtonLink, Card, Icon } from "@/components/ui";
import { FormationCard } from "@/features/formations/formation-card";
import { OffreCard } from "@/features/offres/offre-card";
import { formations, offres } from "@/lib/mock-data";
import { APP_TAGLINE, QUIZ_PASS_SCORE } from "@/lib/constants";

const steps = {
  jeunes: [
    { title: "Créer son profil", desc: "Complétez votre parcours et vos aspirations." },
    { title: "Passer le test", desc: "Validez vos compétences avec nos tests OMB." },
    { title: "Se former", desc: "Accédez à des formations certifiantes exclusives." },
    { title: "Postuler", desc: "Décrochez votre futur emploi ou stage." },
  ],
  entreprises: [
    { title: "Créer un compte", desc: "Présentez votre entreprise et vos valeurs." },
    { title: "Validation OMB", desc: "Accès sécurisé après vérification de nos équipes." },
    { title: "Publier une offre", desc: "Ciblez les profils correspondant à vos besoins." },
    { title: "Consulter les profils", desc: "Accédez à des talents pré-qualifiés et testés." },
  ],
};

const advantages = [
  {
    icon: "verified",
    title: "Profils vérifiés",
    desc: `Exigence de ${QUIZ_PASS_SCORE}%+ au test de validation pour une qualité optimale.`,
  },
  {
    icon: "lightbulb",
    title: "Formations incluses",
    desc: "Soft skills et outils digitaux pour booster l'employabilité.",
  },
  {
    icon: "handshake",
    title: "Mise en relation directe",
    desc: "Simplifiez le recrutement grâce à un matching intelligent.",
  },
];

const stats = [
  { value: "5000+", label: "Jeunes inscrits" },
  { value: "250+", label: "Entreprises partenaires" },
  { value: "50+", label: "Formations" },
  { value: "1200+", label: "Entretiens" },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="mx-auto grid max-w-container-max items-center gap-14 px-margin-mobile py-16 lg:grid-cols-2 lg:px-margin-desktop lg:py-28">
        <div className="flex flex-col gap-8">
          <div className="space-y-5">
            <span className="inline-flex items-center gap-2 rounded-full bg-secondary-container px-3 py-1 text-xs font-bold text-on-secondary-container">
              <Icon name="star" className="text-[16px]" filled /> Orient2Work by OMB
            </span>
            <h1 className="font-headline text-4xl font-bold leading-tight text-primary lg:text-6xl">
              {APP_TAGLINE}
            </h1>
            <p className="max-w-lg text-lg text-on-surface-variant">
              Le réseau qui connecte les jeunes talents avec les entreprises les plus ambitieuses.
              Construisez votre avenir dès aujourd&apos;hui.
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <ButtonLink href="/inscription?role=jeune" variant="secondary" size="lg">
              Je suis un jeune talent
            </ButtonLink>
            <ButtonLink href="/inscription?role=entreprise" variant="outline" size="lg">
              Je suis une entreprise
            </ButtonLink>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary to-primary-container p-10 shadow-level-2">
          <div className="flex h-[420px] flex-col justify-between text-white">
            <Icon name="rocket_launch" className="text-6xl text-secondary-fixed-dim" />
            <div className="space-y-4">
              <p className="font-headline text-2xl font-bold">
                De l&apos;orientation à la préparation, jusqu&apos;à l&apos;opportunité.
              </p>
              <div className="flex gap-6">
                {stats.slice(0, 2).map((s) => (
                  <div key={s.label}>
                    <p className="font-headline text-3xl font-bold text-secondary-fixed-dim">{s.value}</p>
                    <p className="text-sm text-white/70">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="bg-surface-container py-24">
        <div className="mx-auto max-w-container-max px-margin-mobile lg:px-margin-desktop">
          <div className="mb-16 text-center">
            <h2 className="font-headline text-3xl font-bold text-primary">Comment ça marche ?</h2>
            <div className="mx-auto mt-4 h-1 w-20 rounded-full bg-secondary-container" />
          </div>
          <div className="grid gap-10 md:grid-cols-2">
            {(["jeunes", "entreprises"] as const).map((audience) => (
              <Card key={audience} className="p-8">
                <div className="mb-8 flex items-center gap-3">
                  <Icon
                    name={audience === "jeunes" ? "school" : "business"}
                    className="text-3xl text-secondary"
                  />
                  <h3 className="font-headline text-2xl font-bold text-primary">
                    Pour les {audience === "jeunes" ? "Jeunes" : "Entreprises"}
                  </h3>
                </div>
                <ol className="space-y-7">
                  {steps[audience].map((step, i) => (
                    <li key={step.title} className="flex gap-4">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary-container font-bold text-on-secondary-container">
                        {i + 1}
                      </span>
                      <div>
                        <h4 className="font-bold text-primary">{step.title}</h4>
                        <p className="text-sm text-on-surface-variant">{step.desc}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Statistiques */}
      <section className="bg-primary py-16 text-white">
        <div className="mx-auto grid max-w-container-max grid-cols-2 gap-8 px-margin-mobile text-center md:grid-cols-4 lg:px-margin-desktop">
          {stats.map((s) => (
            <div key={s.label}>
              <p className="font-headline text-4xl font-bold text-secondary-fixed-dim">{s.value}</p>
              <p className="mt-1 text-sm font-semibold uppercase tracking-wider text-white/70">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Pourquoi */}
      <section className="mx-auto max-w-container-max px-margin-mobile py-24 lg:px-margin-desktop">
        <h2 className="mb-16 text-center font-headline text-3xl font-bold text-primary">
          Pourquoi choisir Orient2Work ?
        </h2>
        <div className="grid gap-10 md:grid-cols-3">
          {advantages.map((a) => (
            <div key={a.title} className="p-6 text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-surface-container text-primary">
                <Icon name={a.icon} className="text-3xl" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-primary">{a.title}</h3>
              <p className="text-on-surface-variant">{a.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Formations à l'honneur */}
      <section className="bg-surface-container py-24">
        <div className="mx-auto max-w-container-max px-margin-mobile lg:px-margin-desktop">
          <div className="mb-12 flex items-end justify-between">
            <div>
              <h2 className="font-headline text-3xl font-bold text-primary">Formations à l&apos;honneur</h2>
              <p className="text-on-surface-variant">Développez les compétences les plus recherchées.</p>
            </div>
            <ButtonLink href="/formations" variant="ghost" className="hidden sm:inline-flex">
              Toutes les formations <Icon name="arrow_forward" className="text-[18px]" />
            </ButtonLink>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {formations.slice(0, 4).map((f) => (
              <FormationCard key={f.id} formation={f} href="/formations" />
            ))}
          </div>
        </div>
      </section>

      {/* Offres récentes */}
      <section className="mx-auto max-w-container-max px-margin-mobile py-24 lg:px-margin-desktop">
        <div className="mb-12 flex items-end justify-between">
          <div>
            <h2 className="font-headline text-3xl font-bold text-primary">Dernières opportunités</h2>
            <p className="text-on-surface-variant">Des offres publiées par nos entreprises partenaires.</p>
          </div>
          <ButtonLink href="/offres" variant="ghost" className="hidden sm:inline-flex">
            Toutes les offres <Icon name="arrow_forward" className="text-[18px]" />
          </ButtonLink>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {offres
            .filter((o) => o.status === "publiee")
            .map((o) => (
              <OffreCard key={o.id} offre={o} href="/offres" />
            ))}
        </div>
      </section>

      {/* Forums banner */}
      <section className="bg-secondary-container py-14">
        <div className="mx-auto flex max-w-container-max flex-col items-center justify-between gap-8 px-margin-mobile text-on-secondary-container md:flex-row lg:px-margin-desktop">
          <div>
            <h2 className="mb-2 font-headline text-2xl font-bold">
              Forums Entreprises &amp; Écoles Supérieures
            </h2>
            <p className="font-medium">
              Découvrez les opportunités de demain en rencontrant nos partenaires académiques.
            </p>
          </div>
          <ButtonLink href="/a-propos" variant="primary" size="lg" className="whitespace-nowrap">
            Découvrir le calendrier
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
