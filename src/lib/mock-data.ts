/**
 * In-memory sample data for the first version (no backend yet).
 * Structured to mirror the domain models so a real data layer can drop in later.
 */
import type { Entreprise, Entretien, Jeune, Notification, Offre, QuizQuestion } from "./types";

export const currentJeune: Jeune = {
  id: "j1",
  prenom: "Lucas",
  nom: "Dupont",
  email: "lucas.dupont@email.com",
  telephone: "+212 6 12 34 56 78",
  ville: "Casablanca",
  bio: "Étudiant passionné par le développement web et l'intelligence artificielle, à la recherche d'une alternance.",
  titre: "Étudiant en Informatique",
  niveauEtudes: "Bac+3",
  etablissement: "ENSIAS",
  filiere: "Informatique",
  specialite: "Génie logiciel",
  anneeEtude: "3ème année",
  diplome: "Ingénieur d'État (en cours)",
  experiences: [
    {
      id: "e1",
      titre: "Développeur Front-end (Stage)",
      structure: "TechSolutions",
      periode: "Juin 2023 – Août 2023",
      type: "Stage",
      description: "Développement d'une application React pour la gestion interne.",
      competences: ["React", "TypeScript", "Tailwind"],
    },
    {
      id: "e2",
      titre: "Projet de fin d'année",
      structure: "ENSIAS",
      periode: "2023",
      type: "Projet académique",
      description: "Plateforme de recommandation basée sur le machine learning.",
      competences: ["Python", "Scikit-learn", "Flask"],
    },
  ],
  competences: ["React", "TypeScript", "Node.js", "Python", "SQL", "Git", "Figma"],
  langues: ["Français", "Anglais", "Arabe"],
  liens: [
    { id: "l1", type: "LinkedIn", url: "https://linkedin.com/in/lucas-dupont" },
    { id: "l2", type: "GitHub", url: "https://github.com/lucasdupont" },
  ],
  scoreQuiz: 88,
  status: "valide",
  profilCompletion: 85,
  formationsCompletees: 4,
  candidatures: 6,
};

export const entreprises: Entreprise[] = [
  {
    id: "c1",
    nom: "TechSolutions",
    secteur: "Édition de logiciels",
    ville: "Casablanca",
    siteWeb: "https://techsolutions.ma",
    description:
      "Éditeur de solutions SaaS pour les PME. Nous accompagnons la transformation digitale des entreprises marocaines.",
    responsable: "Sophie Martin",
    emailResponsable: "recrutement@techsolutions.ma",
    telephone: "+212 5 22 00 00 00",
    status: "valide",
    offresPubliees: 4,
  },
  {
    id: "c2",
    nom: "Innov'Corp",
    secteur: "Conseil & Innovation",
    ville: "Rabat",
    siteWeb: "https://innovcorp.ma",
    description: "Cabinet de conseil spécialisé dans l'innovation et la stratégie digitale.",
    responsable: "Karim Bennani",
    emailResponsable: "rh@innovcorp.ma",
    telephone: "+212 5 37 00 00 00",
    status: "valide",
    offresPubliees: 2,
  },
  {
    id: "c3",
    nom: "DataFirst",
    secteur: "Data & IA",
    ville: "Marrakech",
    description: "Société de services en data science et intelligence artificielle.",
    responsable: "Yasmine El Amrani",
    emailResponsable: "jobs@datafirst.ma",
    telephone: "+212 5 24 00 00 00",
    status: "attente_validation",
    offresPubliees: 0,
  },
];

export const currentEntreprise = entreprises[0];

export const offres: Offre[] = [
  {
    id: "o1",
    titre: "Développeur Front-end",
    entreprise: { id: "c2", nom: "Innov'Corp", ville: "Rabat" },
    type: "Alternance",
    ville: "Rabat",
    mode: "Hybride",
    niveauDemande: "Bac+3",
    filiere: "Développement web",
    competences: ["React", "TypeScript", "CSS"],
    description:
      "Rejoignez notre équipe produit pour construire des interfaces modernes et performantes.",
    dateLimite: "2026-08-30",
    nombrePostes: 2,
    status: "publiee",
    candidatures: 12,
    publieeLe: "2026-07-01",
  },
  {
    id: "o2",
    titre: "Product Designer",
    entreprise: { id: "c1", nom: "TechSolutions", ville: "Casablanca" },
    type: "Stage",
    ville: "Casablanca",
    mode: "Présentiel",
    niveauDemande: "Bac+3",
    filiere: "Communication",
    competences: ["Figma", "UI/UX", "Design System"],
    description: "Participez à la conception de nos produits SaaS aux côtés de l'équipe design.",
    dateLimite: "2026-08-15",
    nombrePostes: 1,
    status: "publiee",
    candidatures: 8,
    publieeLe: "2026-07-05",
  },
  {
    id: "o3",
    titre: "Data Analyst Junior",
    entreprise: { id: "c3", nom: "DataFirst", ville: "Marrakech" },
    type: "Emploi",
    ville: "Marrakech",
    mode: "À distance",
    niveauDemande: "Bac+5",
    filiere: "Data",
    competences: ["Python", "SQL", "Power BI"],
    description: "Analysez et valorisez les données de nos clients pour orienter leurs décisions.",
    dateLimite: "2026-09-10",
    nombrePostes: 3,
    status: "attente_validation",
    candidatures: 0,
    publieeLe: "2026-07-12",
  },
];

export { formations } from "./mock-formations";

export const entretiens: Entretien[] = [
  {
    id: "i1",
    jeune: { id: "j1", prenom: "Lucas", nom: "Dupont", titre: "Étudiant en Informatique" },
    entreprise: { id: "c1", nom: "TechSolutions" },
    offreTitre: "Développeur Front-end",
    date: "2026-07-20",
    heure: "14:00",
    status: "accepte",
    lienReunion: "https://meet.google.com/abc-defg-hij",
  },
  {
    id: "i2",
    jeune: { id: "j1", prenom: "Lucas", nom: "Dupont", titre: "Étudiant en Informatique" },
    entreprise: { id: "c2", nom: "Innov'Corp" },
    offreTitre: "Product Designer",
    date: "2026-07-24",
    heure: "10:30",
    status: "en_attente",
  },
];

/** Notifications for the current jeune (§5.7 & §9). */
export const jeuneNotifications: Notification[] = [
  {
    id: "n1",
    icon: "business_center",
    title: "TechSolutions a consulté votre profil",
    detail: "Votre profil a retenu l'attention d'un recruteur.",
    time: "Il y a 2 heures",
    read: false,
    accent: true,
    href: "/espace-jeune/profil",
  },
  {
    id: "n2",
    icon: "event_available",
    title: "Entretien confirmé avec TechSolutions",
    detail: "Le 20 juillet à 14:00 en visio-conférence.",
    time: "Il y a 3 heures",
    read: false,
    accent: true,
    href: "/espace-jeune/entretiens",
  },
  {
    id: "n3",
    icon: "work",
    title: "Nouvelle offre correspondant à votre profil",
    detail: "Développeur Front-end — Innov'Corp, Rabat.",
    time: "Il y a 6 heures",
    read: false,
    href: "/espace-jeune/offres",
  },
  {
    id: "n4",
    icon: "send",
    title: "Candidature envoyée",
    detail: "Votre candidature à Product Designer a bien été transmise.",
    time: "Hier",
    read: true,
    href: "/espace-jeune/candidatures",
  },
  {
    id: "n5",
    icon: "school",
    title: "Nouvelle formation disponible",
    detail: "« Utiliser LinkedIn pour trouver des opportunités ».",
    time: "Hier",
    read: true,
    href: "/espace-jeune/formations",
  },
  {
    id: "n6",
    icon: "verified",
    title: "Votre profil est validé",
    detail: "Vous avez réussi votre test avec 88%.",
    time: "Il y a 3 jours",
    read: true,
    href: "/espace-jeune/test",
  },
];

export const quizQuestions: QuizQuestion[] = [
  {
    id: "q1",
    enonce: "Quel hook React permet de gérer un effet de bord ?",
    type: "qcm",
    options: ["useState", "useEffect", "useMemo", "useRef"],
    bonneReponse: 1,
  },
  {
    id: "q2",
    enonce: "TypeScript est un sur-ensemble typé de JavaScript.",
    type: "vrai_faux",
    options: ["Vrai", "Faux"],
    bonneReponse: 0,
  },
  {
    id: "q3",
    enonce: "Quelle méthode HTTP est idempotente et utilisée pour récupérer des données ?",
    type: "qcm",
    options: ["POST", "GET", "PATCH", "DELETE"],
    bonneReponse: 1,
  },
];

/** Aggregate figures for the admin statistics page (§7.6). */
export const adminStats = {
  jeunesInscrits: 5240,
  jeunesValides: 3180,
  entreprisesInscrites: 268,
  entreprisesValidees: 214,
  offresPubliees: 486,
  candidatures: 1920,
  entretiensDemandes: 1240,
  entretiensAcceptes: 870,
  tauxValidationQuiz: 72,
};
