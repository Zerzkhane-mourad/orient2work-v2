import { ButtonLink, Card, CardBody, Icon } from "@/components/ui";
import { ProfileSummaryCard } from "@/features/jeune/profile-summary-card";
import { ParcoursTracker } from "@/features/jeune/parcours-tracker";
import { entretiens, formations, jeuneNotifications, offres } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";

export default function EspaceJeuneDashboard() {
  const nextInterview = entretiens.find((e) => e.status === "accepte");
  const recommended = offres.filter((o) => o.status === "publiee");
  const parcours = [
    { label: "Profil", done: true },
    { label: "Test", done: true },
    { label: "Formations", done: true },
    { label: "Candidatures", done: false, current: true },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <aside className="lg:col-span-3">
        <div className="lg:sticky lg:top-20 space-y-4">
          <ProfileSummaryCard />
          <Card className="bg-primary text-white">
            <CardBody className="space-y-2 text-center">
              <Icon name="workspace_premium" className="mx-auto text-3xl text-secondary-fixed-dim" />
              <p className="text-sm font-semibold">Boostez vos chances de succès</p>
              <ButtonLink href="/espace-jeune/formations" variant="secondary" size="sm" fullWidth>
                Optimiser mon CV
              </ButtonLink>
            </CardBody>
          </Card>
        </div>
      </aside>

      {/* Center — feed */}
      <section className="space-y-4 lg:col-span-6">
        {/* Next-step hero */}
        <Card className="overflow-hidden bg-secondary-container">
          <CardBody className="relative">
            <div className="relative z-10 max-w-lg space-y-3">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-on-secondary-container">
                <Icon name="priority_high" className="text-[16px]" /> Prochaine étape
              </span>
              <h2 className="font-headline text-xl font-bold text-on-secondary-fixed">
                Préparez votre entretien avec TechSolutions
              </h2>
              <p className="text-sm text-on-secondary-fixed-variant">
                Votre entretien approche. Révisez vos bases et préparez vos questions.
              </p>
              <ButtonLink href="/espace-jeune/entretiens" variant="primary" size="sm">
                Guide de préparation
              </ButtonLink>
            </div>
            <Icon
              name="handshake"
              className="pointer-events-none absolute -bottom-6 -right-4 text-[150px] text-on-secondary-container/10"
            />
          </CardBody>
        </Card>

        {/* Parcours */}
        <Card>
          <CardBody>
            <h3 className="mb-6 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              Mon parcours d&apos;accompagnement
            </h3>
            <ParcoursTracker steps={parcours} />
          </CardBody>
        </Card>

        {/* Feed heading */}
        <div className="flex items-center justify-between px-1">
          <h3 className="font-headline text-lg font-bold text-primary">Offres pour vous</h3>
          <ButtonLink href="/espace-jeune/offres" variant="ghost" size="sm">
            Tout voir
          </ButtonLink>
        </div>

        {/* Feed of offers — LinkedIn post-style cards */}
        {recommended.map((o) => (
          <Card key={o.id} interactive>
            <CardBody className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-container-highest text-primary">
                  <Icon name="business" className="text-2xl" />
                </span>
                <div className="flex-1">
                  <h4 className="font-bold text-primary">{o.titre}</h4>
                  <p className="text-sm text-on-surface-variant">^
                    {o.entreprise.nom} • {o.ville}
                  </p>
                  <p className="mt-0.5 text-xs text-on-surface-variant">
                    {o.type} · {o.mode} · Limite {formatDate(o.dateLimite)}
                  </p>
                </div>
                <span className="rounded-full bg-secondary-container px-2.5 py-0.5 text-xs font-bold text-on-secondary-container">
                  {o.type}
                </span>
              </div>
              <p className="text-sm text-on-surface">{o.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {o.competences.map((c) => (
                  <span key={c} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    {c}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2 border-t border-outline-variant pt-3">
                <ButtonLink href={`/espace-jeune/offres/${o.id}`} variant="secondary" size="sm">
                  <Icon name="send" className="text-[16px]" /> Candidater
                </ButtonLink>
                <ButtonLink href={`/espace-jeune/offres/${o.id}`} variant="ghost" size="sm">
                  <Icon name="visibility" className="text-[16px]" /> Détails
                </ButtonLink>
              </div>
            </CardBody>
          </Card>
        ))}
      </section>

      {/* Right rail — suggestions */}
      <aside className="lg:col-span-3">
        <div className="lg:sticky lg:top-20 space-y-4">
          {nextInterview && (
            <Card className="bg-primary text-white">
              <CardBody className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-secondary-fixed-dim">
                  Prochain entretien
                </p>
                <div className="flex items-start gap-3">
                  <div className="min-w-14 rounded-lg bg-white p-2 text-center text-primary">
                    <p className="text-[10px] font-bold uppercase">
                      {new Date(nextInterview.date).toLocaleDateString("fr-FR", { month: "short" })}
                    </p>
                    <p className="text-xl font-bold">{new Date(nextInterview.date).getDate()}</p>
                  </div>
                  <div>
                    <p className="font-bold">{nextInterview.heure}</p>
                    <p className="text-sm text-white/80">{nextInterview.entreprise.nom}</p>
                    <p className="text-xs text-white/60">{nextInterview.offreTitre}</p>
                  </div>
                </div>
                <ButtonLink
                  href={nextInterview.lienReunion ?? "#"}
                  variant="secondary"
                  size="sm"
                  fullWidth
                >
                  <Icon name="video_call" className="text-[16px]" /> Rejoindre
                </ButtonLink>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardBody>
              <div className="mb-3 flex items-center justify-between">
                <h4 className="font-bold text-primary">Notifications</h4>
                <ButtonLink href="/espace-jeune/notifications" variant="ghost" size="sm" className="px-0">
                  Tout voir
                </ButtonLink>
              </div>
              <div className="space-y-1">
                {jeuneNotifications.slice(0, 4).map((n) => (
                  <ButtonLink
                    key={n.id}
                    href={n.href ?? "/espace-jeune/notifications"}
                    variant="ghost"
                    className="flex w-full items-start gap-3 rounded-lg p-2 truncate text-left hover:bg-surface-container-low"
                  >
                    <span className={`mt-0.5 ${n.accent ? "text-secondary" : "text-on-surface-variant"}`}>
                      <Icon name={n.icon} className="text-[18px]" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium leading-snug text-on-surface">{n.title}</span>
                      <span className="block text-xs text-on-surface-variant">{n.time}</span>
                    </span>
                    {!n.read && <span className="ml-auto mt-1.5 h-2 w-2 shrink-0 rounded-full bg-secondary" />}
                  </ButtonLink>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h4 className="mb-3 font-bold text-primary">Formations suggérées</h4>
              <div className="space-y-3">
                {formations.slice(0, 3).map((f) => (
                  <ButtonLink
                    key={f.id}
                    href="/espace-jeune/formations"
                    variant="ghost"
                    className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-surface-container-low"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary-container text-on-secondary-container">
                      <Icon name="school" className="text-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-on-surface">{f.titre}</span>
                      <span className="block text-xs text-on-surface-variant">
                        {f.tempsLectureMin} min de lecture · Certifiante
                      </span>
                    </span>
                  </ButtonLink>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      </aside>
    </div>
  );
}
