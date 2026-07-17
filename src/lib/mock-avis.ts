import type { Avis } from "./types";

/** Sample learner reviews. Dates are pre-formatted labels to keep SSR deterministic. */
export const avis: Avis[] = [
  {
    id: "a1",
    formationId: "f1",
    auteurNom: "Amina El Fassi",
    note: 5,
    commentaire:
      "Exactement ce dont j'avais besoin. La partie sur les mots-clés et les filtres automatiques m'a permis de refaire complètement mon CV. J'ai décroché deux entretiens la semaine suivante.",
    dateLabel: "Il y a 1 semaine",
    utile: 24,
  },
  {
    id: "a2",
    formationId: "f1",
    auteurNom: "Youssef Benali",
    note: 5,
    commentaire:
      "Très concret. La méthode « action + contexte + résultat » change vraiment la façon de décrire ses stages. Rien de superflu, on va droit au but.",
    dateLabel: "Il y a 2 semaines",
    utile: 17,
  },
  {
    id: "a3",
    formationId: "f1",
    auteurNom: "Salma Bennis",
    note: 4,
    commentaire:
      "Contenu clair et bien structuré. J'aurais aimé quelques exemples de CV supplémentaires selon les filières, mais l'essentiel y est.",
    dateLabel: "Il y a 3 semaines",
    utile: 9,
  },
  {
    id: "a4",
    formationId: "f1",
    auteurNom: "Omar Tazi",
    note: 5,
    commentaire: "Court, efficace, et directement applicable. Le modèle réutilisable est un vrai plus.",
    dateLabel: "Il y a 1 mois",
    utile: 6,
  },
  {
    id: "a5",
    formationId: "f1",
    auteurNom: "Nadia Cherkaoui",
    note: 3,
    commentaire:
      "Bon rappel des bases, mais un peu généraliste si vous avez déjà de l'expérience en candidature.",
    dateLabel: "Il y a 1 mois",
    utile: 3,
  },
  {
    id: "a6",
    formationId: "f2",
    auteurNom: "Mehdi Alaoui",
    note: 5,
    commentaire:
      "La structure en trois temps (Vous / Moi / Nous) est redoutablement efficace. Mes lettres sont enfin lues.",
    dateLabel: "Il y a 5 jours",
    utile: 12,
  },
  {
    id: "a7",
    formationId: "f2",
    auteurNom: "Sara Idrissi",
    note: 4,
    commentaire: "Des conseils concrets et faciles à appliquer. Le passage sur les formules creuses fait mouche.",
    dateLabel: "Il y a 2 semaines",
    utile: 8,
  },
  {
    id: "a8",
    formationId: "f3",
    auteurNom: "Lucas Dupont",
    note: 5,
    commentaire:
      "La méthode STAR et le pitch de deux minutes m'ont vraiment aidé à structurer mes réponses. J'étais beaucoup plus serein en entretien.",
    dateLabel: "Il y a 4 jours",
    utile: 31,
  },
  {
    id: "a9",
    formationId: "f3",
    auteurNom: "Imane Roussi",
    note: 5,
    commentaire: "Le chapitre sur le suivi post-entretien est un détail que personne ne mentionne. Excellent.",
    dateLabel: "Il y a 2 semaines",
    utile: 14,
  },
  {
    id: "a10",
    formationId: "f4",
    auteurNom: "Karim Bennani",
    note: 5,
    commentaire: "Mon profil est passé de invisible à consulté plusieurs fois par semaine. Les conseils sur le titre sont décisifs.",
    dateLabel: "Il y a 1 semaine",
    utile: 19,
  },
  {
    id: "a11",
    formationId: "f4",
    auteurNom: "Hajar Lamrani",
    note: 4,
    commentaire: "Très utile pour comprendre la logique de recherche de LinkedIn.",
    dateLabel: "Il y a 3 semaines",
    utile: 5,
  },
  {
    id: "a12",
    formationId: "f5",
    auteurNom: "Reda Alami",
    note: 5,
    commentaire:
      "Une excellente synthèse. La distinction entre état serveur et état d'interface m'a évité pas mal d'erreurs.",
    dateLabel: "Il y a 6 jours",
    utile: 22,
  },
  {
    id: "a13",
    formationId: "f5",
    auteurNom: "Fatima Zahra Kabbaj",
    note: 4,
    commentaire: "Bon niveau, bien expliqué. Idéal avant d'attaquer un vrai projet.",
    dateLabel: "Il y a 2 semaines",
    utile: 11,
  },
];

export const avisPourFormation = (formationId: string) =>
  avis.filter((a) => a.formationId === formationId);
