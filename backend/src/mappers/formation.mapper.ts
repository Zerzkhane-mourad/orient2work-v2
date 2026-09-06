import type { QuestionType } from "@prisma/client";
import type {
  AvisFull,
  FormationDetail,
  FormationListItem,
} from "../repositories/formation.repository.js";

export interface FormationSummaryDto {
  id: string;
  titre: string;
  sousTitre?: string;
  description: string;
  /** Libellé de la catégorie. */
  categorie: string;
  /** Identifiant du référentiel — utile aux formulaires d'administration. */
  categorieId: string;
  filiere?: string;
  /** Identifiant du référentiel filière — absent si la formation est transverse. */
  filiereId?: string;
  image?: string;
  tempsLectureMin: number;
  note?: number;
  nombreAvis: number;
  niveau?: string;
  instructeur?: string;
  populaire: boolean;
  certifiante: boolean;
  objectifs: string[];
  prerequis: string[];
  /** Nombre de chapitres, dérivé des `<h2>` du cours. */
  nombreChapitres: number;
  /** Avancement du jeune connecté ; 0 pour un visiteur anonyme. */
  progression: number;
  /**
   * État de publication.
   *
   * Toujours `true` pour un non-admin — il ne reçoit jamais de brouillon. Exposé
   * pour que le back-office distingue les deux sans requête supplémentaire.
   */
  publiee: boolean;
}

export interface FormationDto extends FormationSummaryDto {
  contenuHtml: string;
  quiz?: {
    titre: string;
    description: string;
    scoreMinimum: number;
    questions: Array<{
      id: string;
      enonce: string;
      type: QuestionType;
      options: string[];
      /** Présent UNIQUEMENT pour un admin — voir `includeAnswers`. */
      bonnesReponses?: number[];
      explication?: string;
      chapitre?: string;
    }>;
  };
}

export interface AvisDto {
  id: string;
  formationId: string;
  auteurNom: string;
  auteurPhoto?: string;
  note: number;
  commentaire: string;
  createdAt: string;
  utile: number;
}

/** Les `<h2>` du cours font office de chapitres (même règle que le lecteur). */
function countChapitres(html: string): number {
  return (html.match(/<h2[\s>]/gi) ?? []).length;
}

export function toFormationSummaryDto(
  formation: FormationListItem,
  progression = 0,
): FormationSummaryDto {
  return {
    id: formation.id,
    titre: formation.titre,
    ...(formation.sousTitre ? { sousTitre: formation.sousTitre } : {}),
    description: formation.description,
    // Le DTO expose le libellé, pas l'identifiant : le contrat vu du client est
    // inchangé depuis que la catégorie est devenue une relation.
    categorie: formation.categorie.nom,
    categorieId: formation.categorie.id,
    ...(formation.filiere
      ? { filiere: formation.filiere.nom, filiereId: formation.filiere.id }
      : {}),
    ...(formation.image ? { image: formation.image } : {}),
    tempsLectureMin: formation.tempsLectureMin,
    ...(formation.note !== null ? { note: formation.note } : {}),
    nombreAvis: formation.nombreAvis,
    ...(formation.niveau ? { niveau: formation.niveau } : {}),
    ...(formation.instructeur ? { instructeur: formation.instructeur } : {}),
    populaire: formation.populaire,
    certifiante: formation.certifiante,
    objectifs: formation.objectifs,
    prerequis: formation.prerequis,
    // `contenuHtml` est chargé pour ce calcul mais n'est pas sérialisé ici :
    // le catalogue reste léger.
    nombreChapitres: countChapitres(formation.contenuHtml),
    progression,
    publiee: formation.publiee,
  };
}

/**
 * `includeAnswers` n'est passé à `true` que pour un administrateur.
 *
 * C'est le point de contrôle qui empêche un jeune de lire `bonneReponse` dans la
 * réponse HTTP et de valider n'importe quel quiz : la correction se fait
 * exclusivement côté serveur, à la soumission.
 */
export function toFormationDto(
  formation: FormationDetail,
  options: { progression?: number; includeAnswers?: boolean } = {},
): FormationDto {
  const { progression = 0, includeAnswers = false } = options;

  const summary = toFormationSummaryDto(
    {
      id: formation.id,
      titre: formation.titre,
      sousTitre: formation.sousTitre,
      description: formation.description,
      categorie: formation.categorie,
      filiere: formation.filiere,
      image: formation.image,
      tempsLectureMin: formation.tempsLectureMin,
      note: formation.note,
      nombreAvis: formation.nombreAvis,
      niveau: formation.niveau,
      instructeur: formation.instructeur,
      populaire: formation.populaire,
      certifiante: formation.certifiante,
      objectifs: formation.objectifs,
      prerequis: formation.prerequis,
      publiee: formation.publiee,
      createdAt: formation.createdAt,
      updatedAt: formation.updatedAt,
      contenuHtml: formation.contenuHtml,
    },
    progression,
  );

  return {
    ...summary,
    contenuHtml: formation.contenuHtml,
    ...(formation.quiz
      ? {
          quiz: {
            titre: formation.quiz.titre,
            description: formation.quiz.description,
            scoreMinimum: formation.quiz.scoreMinimum,
            questions: formation.quiz.questions.map((question) => ({
              id: question.id,
              enonce: question.enonce,
              type: question.type,
              options: question.options,
              ...(includeAnswers
                ? { bonnesReponses: question.bonnesReponses, explication: question.explication }
                : {}),
              ...(question.chapitre ? { chapitre: question.chapitre } : {}),
            })),
          },
        }
      : {}),
  };
}

export function toAvisDto(avis: AvisFull): AvisDto {
  return {
    id: avis.id,
    formationId: avis.formationId,
    auteurNom: `${avis.jeune.prenom} ${avis.jeune.nom.charAt(0)}.`,
    ...(avis.jeune.photo ? { auteurPhoto: avis.jeune.photo } : {}),
    note: avis.note,
    commentaire: avis.commentaire,
    createdAt: avis.createdAt.toISOString(),
    utile: avis.utile,
  };
}
