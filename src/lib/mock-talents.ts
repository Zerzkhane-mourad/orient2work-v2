import type { Jeune } from "./types";
import { currentJeune } from "./mock-data";

/** A small pool of validated talents for the recruiter search engine (§6.5). */
export const talents: Jeune[] = [
  currentJeune,
  {
    ...currentJeune,
    id: "j2",
    prenom: "Amina",
    nom: "El Fassi",
    titre: "Data Analyst Junior",
    ville: "Rabat",
    filiere: "Data",
    niveauEtudes: "Bac+5",
    etablissement: "INPT",
    competences: ["Python", "SQL", "Power BI", "Machine Learning"],
    langues: ["Français", "Anglais"],
    scoreQuiz: 92,
    profilCompletion: 95,
    formationsCompletees: 6,
  },
  {
    ...currentJeune,
    id: "j3",
    prenom: "Youssef",
    nom: "Benali",
    titre: "Product Designer",
    ville: "Casablanca",
    filiere: "Communication",
    niveauEtudes: "Bac+3",
    etablissement: "ESAV",
    competences: ["Figma", "UI/UX", "Prototypage", "Design System"],
    langues: ["Français", "Arabe", "Espagnol"],
    scoreQuiz: 85,
    profilCompletion: 80,
    formationsCompletees: 3,
  },
];
