"use client";

import { use } from "react";
import Image from "next/image";
import Link from "next/link";
import { Card, CardBody, ErrorState, Icon, LoadingState } from "@/components/ui";
import { AvisSection } from "@/features/formations/avis/avis-section";
import { CoursePlayer } from "@/features/formations/course-player";
import { useProfile } from "@/features/jeune/profil/profile-store";
import { api } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";
import { mediaUrl } from "@/lib/api/urls";

export default function FormationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { jeune } = useProfile();

  const { data: formation, loading, error, refetch } = useApi(() => api.formations.byId(id), [id]);

  if (loading) return <LoadingState label="Chargement de la formation…" />;

  if (error || !formation) {
    return (
      <div className="mx-auto max-w-2xl py-10">
        <ErrorState error={error} onRetry={refetch} />
      </div>
    );
  }

  const cover = mediaUrl(formation.image);

  // Le dépôt d'avis suppose d'avoir terminé la lecture — même règle que le backend.
  const dejaLue = jeune.formationsLues?.includes(formation.id) ?? false;

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
        {/* Couverture en bandeau, quand la formation en a une. */}
        {cover && (
          <Image
            src={cover}
            alt=""
            width={1280}
            height={549}
            priority
            className="aspect-[21/9] w-full object-cover"
          />
        )}
        <CardBody className="space-y-3">
          <p className="text-xs text-white/60">
            Formations <span className="mx-1">/</span> {formation.categorie}
          </p>
          <h1 className="font-headline text-2xl font-bold lg:text-3xl">{formation.titre}</h1>
          {formation.sousTitre && <p className="text-white/80">{formation.sousTitre}</p>}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            {formation.populaire && (
              <span className="rounded bg-secondary-container px-2 py-0.5 text-xs font-bold text-on-secondary-container">
                Populaire
              </span>
            )}
            {typeof formation.note === "number" && formation.nombreAvis > 0 && (
              <a href="#avis" className="inline-flex items-center gap-1 hover:underline">
                <span className="font-bold text-secondary-fixed-dim">
                  {formation.note.toFixed(1)}
                </span>
                <span className="flex text-secondary-fixed-dim">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Icon
                      key={i}
                      name="star"
                      filled={i < Math.round(formation.note ?? 0)}
                      className="text-[15px]"
                    />
                  ))}
                </span>
                <span className="text-white/70">({formation.nombreAvis} avis)</span>
              </a>
            )}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/70">
            {formation.instructeur && (
              <span className="flex items-center gap-1">
                <Icon name="person" className="text-[16px]" /> {formation.instructeur}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Icon name="auto_stories" className="text-[16px]" /> {formation.tempsLectureMin} min
              de lecture
            </span>
            <span className="flex items-center gap-1">
              <Icon name="menu_book" className="text-[16px]" /> {formation.nombreChapitres}{" "}
              chapitres
            </span>
            {formation.niveau && (
              <span className="flex items-center gap-1">
                <Icon name="bar_chart" className="text-[16px]" /> {formation.niveau}
              </span>
            )}
          </div>
        </CardBody>
      </Card>

      {/* What you'll learn */}
      {formation.objectifs.length > 0 && (
        <Card>
          <CardBody>
            <h2 className="mb-4 font-headline text-lg font-bold text-primary">
              Ce que vous allez apprendre
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {formation.objectifs.map((o) => (
                <li key={o} className="flex items-start gap-2 text-sm text-on-surface">
                  <Icon name="check" className="mt-0.5 text-[16px] text-success" />
                  {o}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      {/* Lecteur chapitre par chapitre + sommaire.
          `key` : passer d'une formation à l'autre garde le même emplacement dans
          l'arbre React ; sans remontage, le chapitre courant et l'avancement du
          cours précédent seraient repris tels quels. */}
      <CoursePlayer key={formation.id} formation={formation} />

      {/* Learner reviews */}
      <div id="avis">
        <AvisSection formationId={formation.id} canReview={dejaLue} />
      </div>
    </div>
  );
}
