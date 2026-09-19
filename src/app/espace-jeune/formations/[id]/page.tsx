"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ErrorState, Icon, LoadingState } from "@/components/ui";
import { CoursePlayer } from "@/features/formations/course-player";
import {
  FormationHero,
  scrollToId,
} from "@/features/formations/formation-hero";
import {
  FormationTabs,
  type FormationTab,
} from "@/features/formations/formation-tabs";
import { useProfile } from "@/features/jeune/profil/profile-store";
import { api } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";

export default function FormationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { jeune } = useProfile();

  const {
    data: formation,
    loading,
    error,
    refetch,
  } = useApi(() => api.formations.byId(id), [id]);

  // Tenue par le lecteur : l'en-tête reflète l'avancement sans recharger.
  const [progress, setProgress] = useState<number | null>(null);
  const [tab, setTab] = useState<FormationTab>("apercu");

  if (loading) return <LoadingState label="Chargement de la formation…" />;

  if (error || !formation) {
    return (
      <div className="mx-auto max-w-2xl py-10">
        <ErrorState error={error} onRetry={refetch} />
      </div>
    );
  }

  // Le dépôt d'avis suppose d'avoir terminé la lecture — même règle que le backend.
  const lue = jeune.formationsLues?.includes(formation.id) ?? false;
  const validee = jeune.formationsValidees?.includes(formation.id) ?? false;

  const showAvis = () => {
    setTab("avis");
    // Laisse l'onglet se rendre avant de défiler jusqu'à lui.
    requestAnimationFrame(() => scrollToId("details"));
  };

  return (
    <div className="space-y-8">
      {/* Groupés : le lien, masqué sur mobile, ne doit pas pousser le bandeau
          qui y remonte bord à bord sous l'en-tête. */}
      <div>
        <Link
          href="/espace-jeune/formations"
          className="mb-6 hidden items-center gap-1 text-sm text-on-surface-variant hover:text-primary sm:inline-flex"
        >
          <Icon name="arrow_back" className="text-[18px]" /> Retour aux
          formations
        </Link>

        <FormationHero
          formation={formation}
          progress={progress ?? formation.progression}
          lue={lue}
          validee={validee}
          onShowAvis={showAvis}
        />
      </div>

      {/* `key` : passer d'une formation à l'autre garde le même emplacement dans
          l'arbre React ; sans remontage, le chapitre courant et l'avancement du
          cours précédent seraient repris tels quels. */}
      <section id="cours" aria-label="Cours" className="scroll-mt-14">
        <CoursePlayer
          key={formation.id}
          formation={formation}
          onProgressChange={setProgress}
        />
      </section>

      <FormationTabs
        formation={formation}
        tab={tab}
        onTabChange={setTab}
        canReview={lue}
      />
    </div>
  );
}
