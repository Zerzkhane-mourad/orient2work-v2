/**
 * Parcours d'accompagnement du jeune (§5).
 *
 * Quatre étapes, dans l'ordre où la plateforme les attend : compléter son
 * profil, réussir le test de validation, se former, puis candidater.
 *
 * Fonction PURE, séparée du composant : c'est ici que vit la seule logique
 * discutable de l'écran — savoir où en est le jeune — et elle doit pouvoir être
 * vérifiée sans monter un arbre React.
 *
 * Un seul verrou est réel : `candidature.service.ts` refuse toute candidature
 * tant que le statut n'est pas `valide`. Le test, lui, n'est PAS gardé côté
 * serveur — le présenter comme verrouillé serait inventer une règle que l'API
 * n'applique pas, et laisser le jeune buter sur une porte qui n'existe pas.
 */
import type { IconName } from "@/components/ui/icon";
import { QUIZ_PASS_SCORE } from "@/lib/constants";
import { FORMATIONS_OBJECTIF } from "@/lib/score";
import type { Jeune } from "@/lib/types";

/** Complétude de profil visée avant de passer le test. Repère d'interface. */
export const PROFIL_COMPLET_MIN = 80;

export type ParcoursState =
  /** Étape franchie. */
  | "done"
  /** Première étape actionnable — c'est ici que le jeune doit agir. */
  | "current"
  /** Test échoué : franchissable, mais il faut le repasser. */
  | "attention"
  /**
   * Reste à faire, ouverte, mais ce n'est pas la priorité du moment.
   *
   * À NE PAS confondre avec `locked` : rien n'empêche d'y aller. Les afficher
   * comme verrouillées inventerait un enchaînement que l'API n'impose pas —
   * suivre une formation n'a jamais été un préalable pour candidater.
   */
  | "todo"
  /** Réellement fermée par une règle serveur. */
  | "locked";

export interface ParcoursStep {
  key: "profil" | "test" | "formations" | "candidatures";
  label: string;
  icon: IconName;
  href: string;
  state: ParcoursState;
  /** Où en est le jeune, chiffré quand c'est possible. */
  detail: string;
  /** Libellé du bouton, sur les étapes où il y a quelque chose à faire. */
  action: string;
  /** Pourquoi l'étape est fermée. Renseigné seulement si `state === "locked"`. */
  lockedReason?: string;
}

/** Étape sans son état — celui-ci dépend des étapes précédentes. */
type StepDraft = Omit<ParcoursStep, "state"> & { done: boolean; blocked?: boolean };

export function buildParcours(jeune: Jeune): ParcoursStep[] {
  const validees = jeune.formationsValidees?.length ?? 0;
  const testReussi = jeune.status === "valide";
  const testEchoue = jeune.status === "test_echoue";
  const score = jeune.scoreQuiz ?? 0;

  const drafts: StepDraft[] = [
    {
      key: "profil",
      label: "Profil",
      icon: "person",
      href: "/espace-jeune/profil",
      done: jeune.profilCompletion >= PROFIL_COMPLET_MIN,
      detail:
        jeune.profilCompletion >= PROFIL_COMPLET_MIN
          ? `Profil complété à ${jeune.profilCompletion}%`
          : `Complété à ${jeune.profilCompletion}% — visez ${PROFIL_COMPLET_MIN}%`,
      action: "Compléter mon profil",
    },
    {
      key: "test",
      label: "Test",
      icon: "fact_check",
      href: "/espace-jeune/test",
      done: testReussi,
      // Un échec ne se distinguait pas d'un test jamais passé : même point gris,
      // aucune indication qu'on peut le repasser.
      blocked: testEchoue,
      detail: testReussi
        ? `Réussi avec ${score}%`
        : testEchoue
          ? `Score ${score}% — ${QUIZ_PASS_SCORE}% requis`
          : `Non passé — ${QUIZ_PASS_SCORE}% requis`,
      action: testEchoue ? "Repasser le test" : "Passer le test",
    },
    {
      key: "formations",
      label: "Formations",
      icon: "school",
      href: "/espace-jeune/formations",
      done: validees > 0,
      detail:
        validees > 0
          ? `${validees}/${FORMATIONS_OBJECTIF} formation${validees > 1 ? "s" : ""} validée${validees > 1 ? "s" : ""}`
          : "Aucune formation validée",
      action: validees > 0 ? "Continuer à me former" : "Suivre une formation",
    },
    {
      key: "candidatures",
      label: "Candidatures",
      icon: "send",
      href: "/espace-jeune/offres",
      done: jeune.candidatures > 0,
      detail:
        jeune.candidatures > 0
          ? `${jeune.candidatures} candidature${jeune.candidatures > 1 ? "s" : ""} envoyée${jeune.candidatures > 1 ? "s" : ""}`
          : "Aucune candidature envoyée",
      action: "Voir les offres",
      ...(testReussi
        ? {}
        : { lockedReason: "Réussissez le test de validation pour débloquer les candidatures." }),
    },
  ];

  /*
   * L'étape COURANTE est la première qui reste à faire et qui est ouverte.
   *
   * L'ancienne version marquait « Candidatures » comme courante dès qu'elle
   * était vide : un jeune tout juste inscrit était donc dirigé vers la seule
   * action que le serveur allait lui refuser.
   */
  let currentAssigned = false;

  return drafts.map((draft): ParcoursStep => {
    const { done, blocked, ...rest } = draft;
    const locked = Boolean(rest.lockedReason) && !done;

    let state: ParcoursState;
    if (done) {
      state = "done";
    } else if (locked) {
      // Seul verrou réel : `lockedReason` n'est posé que par une règle serveur.
      state = "locked";
    } else if (!currentAssigned) {
      state = blocked ? "attention" : "current";
      currentAssigned = true;
    } else {
      state = "todo";
    }

    return { ...rest, state };
  });
}

/** Part du parcours franchie (0–100), pour la barre de progression. */
export function parcoursProgress(steps: ParcoursStep[]): number {
  if (steps.length === 0) return 0;
  const done = steps.filter((step) => step.state === "done").length;
  // Sur le NOMBRE d'étapes, pas `length - 1` : l'ancienne formule affichait une
  // barre pleine alors qu'il restait une étape à franchir.
  return Math.round((done / steps.length) * 100);
}
