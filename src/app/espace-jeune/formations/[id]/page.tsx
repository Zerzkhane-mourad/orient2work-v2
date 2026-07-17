import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardBody, Icon } from "@/components/ui";
import { LessonReader } from "@/features/formations/lesson-reader";
import { AvisSection } from "@/features/formations/avis/avis-section";
import { currentJeune, formations } from "@/lib/mock-data";
import { avisPourFormation } from "@/lib/mock-avis";
import { countChapitres } from "@/lib/utils";

export default async function FormationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const f = formations.find((x) => x.id === id);
  if (!f) notFound();

  const avis = avisPourFormation(f.id);
  // The headline rating reflects the actual reviews.
  const note = avis.length ? avis.reduce((s, a) => s + a.note, 0) / avis.length : (f.note ?? 0);

  return (
    <div className="space-y-6">
      <Link
        href="/espace-jeune/formations"
        className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary"
      >
        <Icon name="arrow_back" className="text-[18px]" /> Retour aux formations
      </Link>

      {/* Hero */}
      <Card className="overflow-hidden border-0 bg-primary text-white">
        <CardBody className="space-y-3">
          <p className="text-xs text-white/60">
            Formations <span className="mx-1">/</span> {f.categorie}
          </p>
          <h1 className="font-headline text-2xl font-bold lg:text-3xl">{f.titre}</h1>
          {f.sousTitre && <p className="text-white/80">{f.sousTitre}</p>}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            {f.populaire && (
              <span className="rounded bg-secondary-container px-2 py-0.5 text-xs font-bold text-on-secondary-container">
                Populaire
              </span>
            )}
            {avis.length > 0 && (
              <a href="#avis" className="inline-flex items-center gap-1 hover:underline">
                <span className="font-bold text-secondary-fixed-dim">{note.toFixed(1)}</span>
                <span className="flex text-secondary-fixed-dim">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Icon key={i} name="star" filled={i < Math.round(note)} className="text-[15px]" />
                  ))}
                </span>
                <span className="text-white/70">({avis.length} avis)</span>
              </a>
            )}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/70">
            {f.instructeur && (
              <span className="flex items-center gap-1">
                <Icon name="person" className="text-[16px]" /> {f.instructeur}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Icon name="auto_stories" className="text-[16px]" /> {f.tempsLectureMin} min de lecture
            </span>
            <span className="flex items-center gap-1">
              <Icon name="menu_book" className="text-[16px]" /> {countChapitres(f.contenuHtml)} chapitres
            </span>
            {f.niveau && (
              <span className="flex items-center gap-1">
                <Icon name="bar_chart" className="text-[16px]" /> {f.niveau}
              </span>
            )}
          </div>
        </CardBody>
      </Card>

      {/* What you'll learn */}
      {f.objectifs && f.objectifs.length > 0 && (
        <Card>
          <CardBody>
            <h2 className="mb-4 font-headline text-lg font-bold text-primary">
              Ce que vous allez apprendre
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {f.objectifs.map((o) => (
                <li key={o} className="flex items-start gap-2 text-sm text-on-surface">
                  <Icon name="check" className="mt-0.5 text-[16px] text-success" />
                  {o}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      {/* Course text + automatic progress tracking */}
      <LessonReader formation={f} />

      {/* Learner reviews */}
      <div id="avis" className="scroll-mt-24">
        <AvisSection
          formationId={f.id}
          initial={avis}
          auteurNom={`${currentJeune.prenom} ${currentJeune.nom}`}
          auteurPhoto={currentJeune.photo}
        />
      </div>
    </div>
  );
}
