"use client";

import { ErrorState, LoadingState } from "@/components/ui";
import { QuizRunner } from "@/features/test/quiz-runner";
import { api } from "@/lib/api";
import { useApi } from "@/lib/api/use-api";

export default function TestEnCoursPage() {
  // Les questions arrivent SANS les bonnes réponses : la correction se fait
  // exclusivement côté serveur, à la soumission.
  const { data, loading, error, refetch } = useApi(() => api.test.questions(), []);

  if (loading) return <LoadingState label="Préparation de votre test…" />;

  if (error) {
    return (
      <div className="mx-auto max-w-2xl py-10">
        <ErrorState error={error} onRetry={refetch} />
      </div>
    );
  }

  // Le libellé vient du test servi, pas du profil : un candidat dont la filière
  // n'a pas de test reçoit le test commun, et doit le lire tel quel.
  return (
    // `key` : deux tests différents ne doivent jamais partager l'état du
    // lecteur, ni la reprise enregistrée sous l'identifiant précédent.
    <QuizRunner
      key={data?.test.id}
      testId={data?.test.id ?? ""}
      questions={data?.questions ?? []}
      filiere={data?.test.filiere ?? "toutes filières"}
    />
  );
}
