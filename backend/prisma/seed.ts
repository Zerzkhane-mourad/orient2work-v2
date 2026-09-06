/**
 * Données de démonstration.
 *
 * Reprend les jeux de données qui alimentaient le frontend avant son branchement
 * sur l'API — mêmes noms, mêmes statuts, mêmes filières, mêmes formations — pour
 * que l'interface reste peuplée à l'identique en développement.
 *
 * Le jeu couvre volontairement les cas limites que les gardes métier doivent
 * traiter : un jeune au profil incomplet, un autre ayant échoué au test, une
 * entreprise en attente de validation, une offre en attente de modération.
 *
 * Idempotent : relançable sans dupliquer (upsert sur les emails et les titres).
 * Ne créez JAMAIS ces comptes en production — les mots de passe sont publics.
 */
import {
  CandidatureStatus,
  EntrepriseStatus,
  EntretienStatus,
  JeuneStatus,
  OffreStatus,
  PrismaClient,
  QuestionType,
  Role,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  FILIERES_SEED,
  FORMATION_CATEGORIES_SEED,
  QUIZ_PASS_SCORE,
} from "../src/domain/enums.js";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "Orient2Work!2026";
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@orient2work.ma";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Admin!2026Change";

/** Date relative à aujourd'hui — évite un seed qui « périme » avec le temps. */
function inDays(days: number): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

/**
 * Un jour de la semaine EN COURS — 0 = lundi … 6 = dimanche, minuit UTC.
 *
 * Les tableaux de bord tracent une semaine calendaire (lundi → dimanche). Des
 * dates posées « dans N jours » tombent, elles, n'importe où : à cheval sur deux
 * semaines selon le jour où l'on lance le seed, et la courbe reste vide la
 * moitié du temps. Ce repère-ci vise la fenêtre que les graphiques affichent,
 * quel que soit le jour du lancement.
 *
 * `getUTCDay()` rend 0 pour dimanche : le décalage `(jour + 6) % 7` fait de
 * lundi le premier jour, comme dans `semaine.ts` côté frontend.
 */
function jourDeLaSemaine(index: number): Date {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7) + index);
  return date;
}

/** Rang du jour courant dans sa semaine — sert à dater le passé du futur. */
function indexAujourdHui(): number {
  return (new Date().getUTCDay() + 6) % 7;
}

async function createAccount(
  email: string,
  password: string,
  role: Role,
  emailVerified = true,
): Promise<string> {
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role, emailVerified },
    create: {
      email,
      passwordHash,
      role,
      emailVerified,
      emailVerifiedAt: emailVerified ? new Date() : null,
    },
  });
  return user.id;
}

async function main(): Promise<void> {
  console.log("→ Seed Orient2Work");

  // ── Admin ──────────────────────────────────────────────────────────────────
  await createAccount(ADMIN_EMAIL, ADMIN_PASSWORD, Role.ADMIN);
  console.log(`  ✓ admin : ${ADMIN_EMAIL}`);

  // ── Référentiels administrables (§7.4) ─────────────────────────────────────
  //
  // En tête de seed : jeunes, offres, formations et questions de test s'y
  // rattachent par clé étrangère, ils ne peuvent pas être créés avant.
  //
  // `upsert` sur le nom : relancer le seed n'écrase ni l'ordre ni l'état
  // d'activation choisis depuis le back-office.
  const filiereIds = new Map<string, string>();
  for (const [index, nom] of FILIERES_SEED.entries()) {
    const filiere = await prisma.filiere.upsert({
      where: { nom },
      update: {},
      create: { nom, ordre: index },
    });
    filiereIds.set(nom, filiere.id);
  }
  console.log(`  ✓ ${FILIERES_SEED.length} filières`);

  for (const [index, nom] of FORMATION_CATEGORIES_SEED.entries()) {
    await prisma.formationCategorie.upsert({
      where: { nom },
      update: {},
      create: { nom, ordre: index },
    });
  }
  console.log(`  ✓ ${FORMATION_CATEGORIES_SEED.length} catégories de formation`);

  /** Identifiant d'une filière du référentiel ; `null` = entrée transverse. */
  const filiereId = (nom: string | null): string | null =>
    nom === null ? null : (filiereIds.get(nom) ?? null);

  // ── Jeunes ─────────────────────────────────────────────────────────────────
  const jeunesSeed = [
    {
      email: "lucas.dupont@email.com",
      prenom: "Lucas",
      nom: "Dupont",
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
      competences: ["React", "TypeScript", "Node.js", "Python", "SQL", "Git", "Figma"],
      langues: ["Français", "Anglais", "Arabe"],
      scoreQuiz: 88,
      status: JeuneStatus.valide,
      experiences: [
        {
          titre: "Développeur Front-end (Stage)",
          structure: "TechSolutions",
          periode: "Juin 2023 – Août 2023",
          type: "Stage",
          description: "Développement d'une application React pour la gestion interne.",
          competences: ["React", "TypeScript", "Tailwind"],
        },
        {
          titre: "Projet de fin d'année",
          structure: "ENSIAS",
          periode: "2023",
          type: "Projet académique",
          description: "Plateforme de recommandation basée sur le machine learning.",
          competences: ["Python", "Scikit-learn", "Flask"],
        },
      ],
      liens: [
        { type: "LinkedIn", url: "https://linkedin.com/in/lucas-dupont" },
        { type: "GitHub", url: "https://github.com/lucasdupont" },
      ],
    },
    {
      email: "amina.elfassi@email.com",
      prenom: "Amina",
      nom: "El Fassi",
      telephone: "+212 6 22 33 44 55",
      ville: "Rabat",
      bio: "Data analyst junior, spécialisée en visualisation et modélisation prédictive.",
      titre: "Data Analyst Junior",
      niveauEtudes: "Bac+5",
      etablissement: "INPT",
      filiere: "Data",
      specialite: "Business Intelligence",
      competences: ["Python", "SQL", "Power BI", "Machine Learning"],
      langues: ["Français", "Anglais"],
      scoreQuiz: 92,
      status: JeuneStatus.valide,
      experiences: [
        {
          titre: "Stage Data Analyst",
          structure: "DataFirst",
          periode: "Févr. 2024 – Août 2024",
          type: "Stage",
          description: "Construction de tableaux de bord décisionnels pour le retail.",
          competences: ["Power BI", "SQL"],
        },
      ],
      liens: [{ type: "LinkedIn", url: "https://linkedin.com/in/amina-elfassi" }],
    },
    {
      email: "youssef.benali@email.com",
      prenom: "Youssef",
      nom: "Benali",
      telephone: "+212 6 66 77 88 99",
      ville: "Casablanca",
      bio: "Product designer attentif à l'accessibilité et aux systèmes de design.",
      titre: "Product Designer",
      niveauEtudes: "Bac+3",
      etablissement: "ESAV",
      filiere: "Communication",
      competences: ["Figma", "UI/UX", "Prototypage", "Design System"],
      langues: ["Français", "Arabe", "Espagnol"],
      scoreQuiz: 85,
      status: JeuneStatus.valide,
      experiences: [
        {
          titre: "Designer freelance",
          structure: "Indépendant",
          periode: "2023 – 2024",
          type: "Freelance",
          description: "Refonte d'identités visuelles et d'interfaces pour des PME.",
          competences: ["Figma", "Illustrator"],
        },
      ],
      liens: [{ type: "Portfolio", url: "https://youssefbenali.design" }],
    },
    {
      email: "sara.idrissi@email.com",
      prenom: "Sara",
      nom: "Idrissi",
      telephone: "+212 6 11 22 33 44",
      ville: "Marrakech",
      titre: "Étudiante en Marketing",
      niveauEtudes: "Bac+2",
      etablissement: "ISCAE",
      filiere: "Marketing",
      competences: ["SEO", "Réseaux sociaux"],
      langues: ["Français", "Arabe"],
      scoreQuiz: 62,
      // Profil qui a échoué au test : utile pour vérifier les gardes métier.
      status: JeuneStatus.test_echoue,
      experiences: [],
      liens: [],
    },
    {
      email: "omar.tazi@email.com",
      prenom: "Omar",
      nom: "Tazi",
      telephone: "",
      ville: "Fès",
      titre: "",
      niveauEtudes: "Bac+3",
      etablissement: "FST Fès",
      filiere: "Réseaux et télécommunications",
      competences: [],
      langues: ["Français"],
      scoreQuiz: null,
      status: JeuneStatus.profil_incomplet,
      experiences: [],
      liens: [],
    },
  ];

  const jeuneIds = new Map<string, string>();

  for (const seed of jeunesSeed) {
    const userId = await createAccount(seed.email, DEMO_PASSWORD, Role.JEUNE);
    const jeune = await prisma.jeune.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        prenom: seed.prenom,
        nom: seed.nom,
        telephone: seed.telephone,
        ville: seed.ville,
        bio: seed.bio ?? null,
        titre: seed.titre,
        niveauEtudes: seed.niveauEtudes,
        etablissement: seed.etablissement,
        filiereId: filiereId(seed.filiere),
        specialite: seed.specialite ?? null,
        anneeEtude: seed.anneeEtude ?? null,
        diplome: seed.diplome ?? null,
        competences: seed.competences,
        langues: seed.langues,
        scoreQuiz: seed.scoreQuiz,
        status: seed.status,
      },
    });
    jeuneIds.set(seed.email, jeune.id);

    await prisma.experience.deleteMany({ where: { jeuneId: jeune.id } });
    if (seed.experiences.length > 0) {
      await prisma.experience.createMany({
        data: seed.experiences.map((experience, index) => ({
          jeuneId: jeune.id,
          ...experience,
          ordre: index,
        })),
      });
    }

    await prisma.lien.deleteMany({ where: { jeuneId: jeune.id } });
    if (seed.liens.length > 0) {
      await prisma.lien.createMany({
        data: seed.liens.map((lien) => ({ jeuneId: jeune.id, ...lien })),
      });
    }
  }
  console.log(`  ✓ ${jeunesSeed.length} jeunes`);

  // ── Entreprises ────────────────────────────────────────────────────────────
  const entreprisesSeed = [
    {
      email: "recrutement@techsolutions.ma",
      nom: "TechSolutions",
      secteur: "Édition de logiciels",
      ville: "Casablanca",
      siteWeb: "https://techsolutions.ma",
      description:
        "Éditeur de solutions SaaS pour les PME. Nous accompagnons la transformation digitale des entreprises marocaines.",
      responsable: "Sophie Martin",
      telephone: "+212 5 22 00 00 00",
      status: EntrepriseStatus.valide,
    },
    {
      email: "rh@innovcorp.ma",
      nom: "Innov'Corp",
      secteur: "Conseil & Innovation",
      ville: "Rabat",
      siteWeb: "https://innovcorp.ma",
      description: "Cabinet de conseil spécialisé dans l'innovation et la stratégie digitale.",
      responsable: "Karim Bennani",
      telephone: "+212 5 37 00 00 00",
      status: EntrepriseStatus.valide,
    },
    {
      email: "jobs@datafirst.ma",
      nom: "DataFirst",
      secteur: "Data & IA",
      ville: "Marrakech",
      siteWeb: null,
      description: "Société de services en data science et intelligence artificielle.",
      responsable: "Yasmine El Amrani",
      telephone: "+212 5 24 00 00 00",
      // Entreprise non validée : sert à tester les refus (publication, talents).
      status: EntrepriseStatus.attente_validation,
    },
  ];

  const entrepriseIds = new Map<string, string>();

  for (const seed of entreprisesSeed) {
    const userId = await createAccount(seed.email, DEMO_PASSWORD, Role.ENTREPRISE);
    const entreprise = await prisma.entreprise.upsert({
      where: { userId },
      update: { status: seed.status },
      create: {
        userId,
        nom: seed.nom,
        secteur: seed.secteur,
        ville: seed.ville,
        siteWeb: seed.siteWeb,
        description: seed.description,
        responsable: seed.responsable,
        emailResponsable: seed.email,
        telephone: seed.telephone,
        status: seed.status,
      },
    });
    entrepriseIds.set(seed.nom, entreprise.id);
  }
  console.log(`  ✓ ${entreprisesSeed.length} entreprises`);

  // ── Offres ─────────────────────────────────────────────────────────────────
  const offresSeed = [
    {
      entreprise: "Innov'Corp",
      titre: "Développeur Front-end",
      type: "Alternance",
      ville: "Rabat",
      mode: "Hybride",
      niveauDemande: "Bac+3",
      filiere: "Développement web",
      competences: ["React", "TypeScript", "CSS"],
      description:
        "Rejoignez notre équipe produit pour construire des interfaces modernes et performantes. Vous travaillerez au contact direct des designers et des développeurs back-end.",
      dateLimite: inDays(45),
      nombrePostes: 2,
      status: OffreStatus.publiee,
      publieeLe: inDays(-20),
    },
    {
      entreprise: "TechSolutions",
      titre: "Product Designer",
      type: "Stage",
      ville: "Casablanca",
      mode: "Présentiel",
      niveauDemande: "Bac+3",
      filiere: "Communication",
      competences: ["Figma", "UI/UX", "Design System"],
      description:
        "Participez à la conception de nos produits SaaS aux côtés de l'équipe design : recherche utilisateur, maquettes, prototypes et contribution au design system.",
      dateLimite: inDays(30),
      nombrePostes: 1,
      status: OffreStatus.publiee,
      publieeLe: inDays(-15),
    },
    {
      entreprise: "DataFirst",
      titre: "Data Analyst Junior",
      type: "Emploi",
      ville: "Marrakech",
      mode: "À distance",
      niveauDemande: "Bac+5",
      filiere: "Data",
      competences: ["Python", "SQL", "Power BI"],
      description:
        "Analysez et valorisez les données de nos clients pour orienter leurs décisions stratégiques. Vous produirez des tableaux de bord et des analyses ad hoc.",
      dateLimite: inDays(60),
      nombrePostes: 3,
      // En attente de modération : alimente la file admin.
      status: OffreStatus.attente_validation,
      publieeLe: null,
    },
    {
      entreprise: "TechSolutions",
      titre: "Développeur Back-end Node.js",
      type: "PFE",
      ville: "Casablanca",
      mode: "Hybride",
      niveauDemande: "Bac+5",
      filiere: "Informatique",
      competences: ["Node.js", "PostgreSQL", "Docker"],
      description:
        "Projet de fin d'études autour de la conception d'une API REST sécurisée et de son déploiement continu.",
      dateLimite: inDays(25),
      nombrePostes: 1,
      status: OffreStatus.publiee,
      publieeLe: inDays(-8),
    },
    {
      entreprise: "Innov'Corp",
      titre: "Chargé de communication digitale",
      type: "Stage",
      ville: "Rabat",
      mode: "Présentiel",
      niveauDemande: "Bac+2",
      filiere: "Marketing",
      competences: ["SEO", "Réseaux sociaux", "Rédaction"],
      description:
        "Animez nos canaux digitaux : rédaction de contenus, planification éditoriale et suivi des indicateurs de performance.",
      dateLimite: inDays(40),
      nombrePostes: 1,
      status: OffreStatus.brouillon,
      publieeLe: null,
    },
  ];

  const offreIds = new Map<string, string>();

  for (const seed of offresSeed) {
    const entrepriseId = entrepriseIds.get(seed.entreprise)!;
    const existing = await prisma.offre.findFirst({
      where: { entrepriseId, titre: seed.titre },
      select: { id: true },
    });

    const data = {
      entrepriseId,
      titre: seed.titre,
      type: seed.type,
      ville: seed.ville,
      mode: seed.mode,
      niveauDemande: seed.niveauDemande,
      filiereId: filiereIds.get(seed.filiere)!,
      competences: seed.competences,
      description: seed.description,
      dateLimite: seed.dateLimite,
      nombrePostes: seed.nombrePostes,
      status: seed.status,
      publieeLe: seed.publieeLe,
    };

    const offre = existing
      ? await prisma.offre.update({ where: { id: existing.id }, data })
      : await prisma.offre.create({ data });

    offreIds.set(seed.titre, offre.id);
  }
  console.log(`  ✓ ${offresSeed.length} offres`);

  // ── Formations ─────────────────────────────────────────────────────────────
  const formationsSeed = [
    {
      titre: "Rédiger un CV qui retient l'attention",
      sousTitre: "Structure, contenu et erreurs à éviter",
      description:
        "Apprenez à construire un CV clair, ciblé et convaincant, adapté aux attentes des recruteurs marocains.",
      categorie: "CV",
      tempsLectureMin: 12,
      niveau: "Débutant",
      instructeur: "Équipe OMB",
      populaire: true,
      certifiante: true,
      objectifs: [
        "Structurer un CV en une page",
        "Valoriser ses expériences avec des résultats mesurables",
        "Adapter son CV à chaque offre",
      ],
      prerequis: ["Aucun"],
      contenuHtml: `
        <h2>Pourquoi votre CV compte</h2>
        <p>Un recruteur consacre en moyenne moins d'une minute à un premier tri. Votre CV doit donc répondre à une question simple : <strong>pourquoi vous ?</strong></p>
        <h2>La structure attendue</h2>
        <p>Quatre blocs suffisent : en-tête, expériences, formation, compétences. L'ordre dépend de votre profil : un étudiant place sa formation en premier, un profil expérimenté commence par ses expériences.</p>
        <ul><li>En-tête : nom, titre, contact, liens utiles</li><li>Expériences : verbe d'action, contexte, résultat chiffré</li><li>Formation : diplôme, établissement, année</li><li>Compétences : techniques puis linguistiques</li></ul>
        <h2>Les erreurs qui éliminent</h2>
        <p>Fautes d'orthographe, photo inadaptée, adresse email fantaisiste, CV de trois pages : ces détails suffisent à écarter une candidature avant même la lecture du contenu.</p>
        <h2>Adapter à chaque offre</h2>
        <p>Reprenez les mots-clés de l'annonce. Beaucoup d'entreprises filtrent les candidatures automatiquement : un vocabulaire aligné améliore nettement vos chances.</p>
      `,
      quiz: {
        titre: "Valider ses acquis — CV",
        description: "Quelques questions pour vérifier les points essentiels du module.",
        scoreMinimum: 80,
        questions: [
          {
            enonce: "Quelle est la longueur recommandée d'un CV pour un profil junior ?",
            type: QuestionType.qcm,
            options: ["Une page", "Deux pages", "Trois pages", "Peu importe"],
            bonnesReponses: [0],
            explication:
              "Une page suffit pour un profil junior : au-delà, l'information utile se dilue.",
            chapitre: "La structure attendue",
          },
          {
            enonce: "Il faut adapter son CV à chaque offre.",
            type: QuestionType.vrai_faux,
            options: ["Vrai", "Faux"],
            bonnesReponses: [0],
            explication:
              "Reprendre les mots-clés de l'annonce améliore le passage des filtres automatiques.",
            chapitre: "Adapter à chaque offre",
          },
          {
            enonce: "Quel élément valorise le mieux une expérience ?",
            type: QuestionType.qcm,
            options: [
              "La durée du contrat",
              "Un résultat chiffré",
              "Le nom du manager",
              "La taille de l'entreprise",
            ],
            bonnesReponses: [1],
            explication: "Un résultat mesurable prouve l'impact réel de votre travail.",
            chapitre: "La structure attendue",
          },
        ],
      },
    },
    {
      titre: "Réussir son entretien d'embauche",
      sousTitre: "Préparation, déroulé et suivi",
      description:
        "Les clés pour aborder un entretien avec méthode : préparation, réponses structurées et relance.",
      categorie: "Entretien",
      tempsLectureMin: 15,
      niveau: "Intermédiaire",
      instructeur: "Équipe OMB",
      populaire: true,
      certifiante: true,
      objectifs: [
        "Préparer ses réponses avec la méthode STAR",
        "Poser les bonnes questions au recruteur",
        "Assurer un suivi professionnel",
      ],
      prerequis: ["Avoir un CV à jour"],
      contenuHtml: `
        <h2>Avant l'entretien</h2>
        <p>Renseignez-vous sur l'entreprise : activité, actualités, culture. Préparez trois exemples concrets illustrant vos compétences clés.</p>
        <h2>La méthode STAR</h2>
        <p><strong>S</strong>ituation, <strong>T</strong>âche, <strong>A</strong>ction, <strong>R</strong>ésultat : cette trame transforme une anecdote en démonstration de compétence.</p>
        <h2>Les questions à poser</h2>
        <p>Un entretien est un échange. Interrogez le recruteur sur l'équipe, les projets à venir et les critères de réussite du poste.</p>
        <h2>Après l'entretien</h2>
        <p>Un email de remerciement dans les 24 heures, court et personnalisé, marque durablement votre professionnalisme.</p>
      `,
      quiz: {
        titre: "Valider ses acquis — Entretien",
        description: "Vérifiez que la méthode est acquise.",
        scoreMinimum: 80,
        questions: [
          {
            enonce: "Que signifie le « R » de la méthode STAR ?",
            type: QuestionType.qcm,
            options: ["Rôle", "Résultat", "Référence", "Ressenti"],
            bonnesReponses: [1],
            explication: "Le résultat démontre l'impact concret de votre action.",
            chapitre: "La méthode STAR",
          },
          {
            enonce: "Envoyer un email de remerciement après l'entretien est recommandé.",
            type: QuestionType.vrai_faux,
            options: ["Vrai", "Faux"],
            bonnesReponses: [0],
            explication: "Un message court sous 24 heures renforce une impression positive.",
            chapitre: "Après l'entretien",
          },
        ],
      },
    },
    {
      titre: "Utiliser LinkedIn pour trouver des opportunités",
      sousTitre: "Profil, réseau et veille",
      description:
        "Transformez votre profil LinkedIn en véritable outil de recherche d'opportunités.",
      categorie: "LinkedIn",
      tempsLectureMin: 10,
      niveau: "Débutant",
      instructeur: "Équipe OMB",
      populaire: false,
      certifiante: true,
      objectifs: [
        "Optimiser son profil",
        "Développer un réseau utile",
        "Suivre les entreprises cibles",
      ],
      prerequis: ["Un compte LinkedIn"],
      contenuHtml: `
        <h2>Un profil qui se trouve</h2>
        <p>Titre explicite, photo professionnelle, résumé orienté projet : c'est ce qui décide un recruteur à ouvrir votre profil dans une liste de résultats.</p>
        <h2>Développer son réseau</h2>
        <p>Ciblez des personnes de votre secteur et accompagnez chaque invitation d'un message court expliquant votre démarche.</p>
        <h2>La veille</h2>
        <p>Suivez les entreprises qui vous intéressent et activez les alertes d'offres : la réactivité fait souvent la différence.</p>
      `,
      quiz: {
        titre: "Valider ses acquis — LinkedIn",
        description: "Trois questions rapides.",
        scoreMinimum: 80,
        questions: [
          {
            enonce: "Quel élément rend un profil plus visible dans les recherches ?",
            type: QuestionType.qcm,
            options: [
              "Un titre explicite",
              "Un fond d'écran coloré",
              "Un grand nombre de publications",
              "Un pseudonyme",
            ],
            bonnesReponses: [0],
            explication:
              "Le titre est l'un des champs les plus pesants dans le moteur de recherche.",
            chapitre: "Un profil qui se trouve",
          },
          {
            enonce: "Une invitation accompagnée d'un message a plus de chances d'être acceptée.",
            type: QuestionType.vrai_faux,
            options: ["Vrai", "Faux"],
            bonnesReponses: [0],
            explication: "Le contexte rassure et distingue votre demande.",
            chapitre: "Développer son réseau",
          },
        ],
      },
    },
    {
      titre: "La lettre de motivation qui complète le CV",
      sousTitre: "Argumenter sans répéter",
      description: "Structurer une lettre courte, personnalisée et centrée sur l'entreprise.",
      categorie: "Lettre de motivation",
      tempsLectureMin: 9,
      niveau: "Débutant",
      instructeur: "Équipe OMB",
      populaire: false,
      certifiante: false,
      objectifs: ["Éviter la paraphrase du CV", "Personnaliser chaque lettre"],
      prerequis: [],
      contenuHtml: `
        <h2>Le rôle de la lettre</h2>
        <p>La lettre n'est pas un résumé du CV : elle explique pourquoi cette entreprise et pourquoi vous.</p>
        <h2>Une structure en trois temps</h2>
        <p>Vous (l'entreprise), moi (mon apport), nous (le projet commun). Trois paragraphes courts suffisent.</p>
      `,
      quiz: null,
    },
    {
      titre: "Soft skills : communiquer et travailler en équipe",
      sousTitre: "Les compétences que les recruteurs évaluent",
      description:
        "Identifier, développer et prouver les compétences comportementales attendues en entreprise.",
      categorie: "Soft skills",
      tempsLectureMin: 14,
      niveau: "Tous niveaux",
      instructeur: "Équipe OMB",
      populaire: true,
      certifiante: true,
      objectifs: ["Nommer ses soft skills", "Les illustrer par des exemples"],
      prerequis: [],
      contenuHtml: `
        <h2>De quoi parle-t-on ?</h2>
        <p>Communication, adaptabilité, esprit d'équipe, gestion du temps : autant de compétences transversales qui pèsent lourd dans une décision d'embauche.</p>
        <h2>Les prouver</h2>
        <p>Une soft skill affirmée sans exemple n'a aucune valeur. Associez systématiquement une situation vécue à chaque compétence annoncée.</p>
      `,
      quiz: {
        titre: "Valider ses acquis — Soft skills",
        description: "Deux questions de synthèse.",
        scoreMinimum: 80,
        questions: [
          {
            enonce: "Comment rendre crédible une soft skill sur un CV ?",
            type: QuestionType.qcm,
            options: [
              "En la mettant en gras",
              "En l'illustrant par une situation vécue",
              "En la répétant plusieurs fois",
              "En la traduisant en anglais",
            ],
            bonnesReponses: [1],
            explication: "L'exemple concret est la seule preuve recevable.",
            chapitre: "Les prouver",
          },
          {
            enonce: "Les soft skills sont évaluées lors des entretiens.",
            type: QuestionType.vrai_faux,
            options: ["Vrai", "Faux"],
            bonnesReponses: [0],
            explication: "Elles font partie intégrante de la grille d'évaluation des recruteurs.",
            chapitre: "De quoi parle-t-on ?",
          },
        ],
      },
    },
  ];

  const formationIds = new Map<string, string>();

  for (const seed of formationsSeed) {
    const { quiz, categorie, ...formationData } = seed;

    // La catégorie est un référentiel administrable : on la résout par son nom,
    // en la créant si elle a été supprimée depuis le back-office.
    const categorieRow = await prisma.formationCategorie.upsert({
      where: { nom: categorie },
      update: {},
      create: { nom: categorie, ordre: 100 },
    });

    const existing = await prisma.formation.findFirst({
      where: { titre: seed.titre },
      select: { id: true },
    });

    const data = {
      ...formationData,
      contenuHtml: formationData.contenuHtml.trim(),
      publiee: true,
      categorieId: categorieRow.id,
    };

    const formation = existing
      ? await prisma.formation.update({ where: { id: existing.id }, data })
      : await prisma.formation.create({ data });

    formationIds.set(seed.titre, formation.id);

    await prisma.formationQuiz.deleteMany({ where: { formationId: formation.id } });
    if (quiz) {
      await prisma.formationQuiz.create({
        data: {
          formationId: formation.id,
          titre: quiz.titre,
          description: quiz.description,
          scoreMinimum: quiz.scoreMinimum,
          questions: {
            create: quiz.questions.map((question, index) => ({
              enonce: question.enonce,
              type: question.type,
              options: question.options,
              bonnesReponses: question.bonnesReponses,
              explication: question.explication,
              chapitre: question.chapitre ?? null,
              ordre: index,
            })),
          },
        },
      });
    }
  }
  console.log(`  ✓ ${formationsSeed.length} formations`);

  // ── Progression & avis ─────────────────────────────────────────────────────
  const lucasId = jeuneIds.get("lucas.dupont@email.com")!;
  const aminaId = jeuneIds.get("amina.elfassi@email.com")!;
  const youssefId = jeuneIds.get("youssef.benali@email.com")!;

  const cvFormationId = formationIds.get("Rédiger un CV qui retient l'attention")!;
  const entretienFormationId = formationIds.get("Réussir son entretien d'embauche")!;
  const linkedinFormationId = formationIds.get("Utiliser LinkedIn pour trouver des opportunités")!;
  const softSkillsFormationId = formationIds.get(
    "Soft skills : communiquer et travailler en équipe",
  )!;

  const progressions = [
    {
      jeuneId: lucasId,
      formationId: cvFormationId,
      progression: 100,
      lu: true,
      valide: true,
      meilleurScore: 90,
    },
    {
      jeuneId: lucasId,
      formationId: entretienFormationId,
      progression: 45,
      lu: false,
      valide: false,
      meilleurScore: null,
    },
    {
      jeuneId: aminaId,
      formationId: cvFormationId,
      progression: 100,
      lu: true,
      valide: true,
      meilleurScore: 100,
    },
    {
      jeuneId: aminaId,
      formationId: entretienFormationId,
      progression: 100,
      lu: true,
      valide: true,
      meilleurScore: 95,
    },
    {
      jeuneId: aminaId,
      formationId: linkedinFormationId,
      progression: 100,
      lu: true,
      valide: true,
      meilleurScore: 88,
    },
    {
      jeuneId: aminaId,
      formationId: softSkillsFormationId,
      progression: 100,
      lu: true,
      valide: true,
      meilleurScore: 92,
    },
    {
      jeuneId: youssefId,
      formationId: cvFormationId,
      progression: 100,
      lu: true,
      valide: true,
      meilleurScore: 85,
    },
    {
      jeuneId: youssefId,
      formationId: softSkillsFormationId,
      progression: 70,
      lu: false,
      valide: false,
      meilleurScore: null,
    },
  ];

  for (const progression of progressions) {
    await prisma.formationProgress.upsert({
      where: {
        jeuneId_formationId: {
          jeuneId: progression.jeuneId,
          formationId: progression.formationId,
        },
      },
      update: progression,
      create: {
        ...progression,
        luAt: progression.lu ? new Date() : null,
        valideAt: progression.valide ? new Date() : null,
      },
    });
  }

  const avisSeed = [
    {
      formationId: cvFormationId,
      jeuneId: lucasId,
      note: 5,
      commentaire: "Concret et directement applicable. Mon CV a beaucoup gagné en clarté.",
      utile: 12,
    },
    {
      formationId: cvFormationId,
      jeuneId: aminaId,
      note: 4,
      commentaire: "Bon module. J'aurais aimé quelques exemples supplémentaires par secteur.",
      utile: 5,
    },
    {
      formationId: entretienFormationId,
      jeuneId: aminaId,
      note: 5,
      commentaire: "La méthode STAR m'a vraiment aidée à structurer mes réponses.",
      utile: 9,
    },
  ];

  for (const avis of avisSeed) {
    await prisma.avis.upsert({
      where: { formationId_jeuneId: { formationId: avis.formationId, jeuneId: avis.jeuneId } },
      update: { note: avis.note, commentaire: avis.commentaire, utile: avis.utile },
      create: avis,
    });
  }

  // Recalcule les moyennes, comme le fait le service après chaque avis.
  for (const formationId of new Set(avisSeed.map((avis) => avis.formationId))) {
    const aggregate = await prisma.avis.aggregate({
      where: { formationId },
      _avg: { note: true },
      _count: { _all: true },
    });
    await prisma.formation.update({
      where: { id: formationId },
      data: {
        note: aggregate._avg.note ? Math.round(aggregate._avg.note * 10) / 10 : null,
        nombreAvis: aggregate._count._all,
      },
    });
  }
  console.log("  ✓ progressions et avis");

  // ── Candidatures ───────────────────────────────────────────────────────────
  const candidaturesSeed = [
    {
      jeuneId: lucasId,
      offre: "Développeur Front-end",
      status: CandidatureStatus.entretien,
      message: "Bonjour, je suis très intéressé par cette alternance en front-end.",
    },
    {
      jeuneId: lucasId,
      offre: "Développeur Back-end Node.js",
      status: CandidatureStatus.vue,
      message: "Mon PFE porte précisément sur la conception d'API sécurisées.",
    },
    {
      jeuneId: aminaId,
      offre: "Développeur Front-end",
      status: CandidatureStatus.preselectionnee,
      message: null,
    },
    {
      jeuneId: youssefId,
      offre: "Product Designer",
      status: CandidatureStatus.envoyee,
      message: "Mon portfolio illustre plusieurs refontes complètes d'interfaces.",
    },
  ];

  for (const seed of candidaturesSeed) {
    const offreId = offreIds.get(seed.offre)!;
    await prisma.candidature.upsert({
      where: { jeuneId_offreId: { jeuneId: seed.jeuneId, offreId } },
      update: { status: seed.status },
      create: {
        jeuneId: seed.jeuneId,
        offreId,
        status: seed.status,
        message: seed.message,
        vueLe: seed.status === CandidatureStatus.envoyee ? null : new Date(),
      },
    });
  }
  console.log(`  ✓ ${candidaturesSeed.length} candidatures`);

  /* ── Candidatures DATÉES sur la semaine en cours ──────────────────────────
   *
   * Le tableau de bord entreprise trace les candidatures REÇUES jour par jour.
   * Les candidatures ci-dessus sont créées avec le `createdAt` par défaut,
   * c'est-à-dire l'instant du seed : elles s'empilent donc toutes sur une seule
   * colonne, et la courbe n'a rien à montrer.
   *
   * Celles-ci portent une date explicite, étalée du lundi au vendredi. Le
   * couple (jeune, offre) est unique en base : ces cinq paires sont celles que
   * le bloc précédent laisse libres — d'où cinq candidatures et pas douze.
   */
  const candidaturesSemaine = [
    { jeuneId: lucasId, offre: "Product Designer", jour: 0, status: CandidatureStatus.vue },
    { jeuneId: aminaId, offre: "Développeur Back-end Node.js", jour: 1, status: CandidatureStatus.envoyee },
    { jeuneId: youssefId, offre: "Développeur Front-end", jour: 2, status: CandidatureStatus.envoyee },
    { jeuneId: aminaId, offre: "Product Designer", jour: 2, status: CandidatureStatus.preselectionnee },
    { jeuneId: youssefId, offre: "Développeur Back-end Node.js", jour: 4, status: CandidatureStatus.envoyee },
  ];

  for (const seed of candidaturesSemaine) {
    const offreId = offreIds.get(seed.offre)!;
    const recuLe = jourDeLaSemaine(seed.jour);
    // 9h UTC plutôt que minuit : une candidature déposée « à minuit pile » se
    // lit comme une donnée fabriquée, et minuit est le bord exact du
    // regroupement par jour — autant s'en éloigner.
    recuLe.setUTCHours(9, 0, 0, 0);

    await prisma.candidature.upsert({
      where: { jeuneId_offreId: { jeuneId: seed.jeuneId, offreId } },
      update: { status: seed.status, createdAt: recuLe },
      create: {
        jeuneId: seed.jeuneId,
        offreId,
        status: seed.status,
        createdAt: recuLe,
        vueLe: seed.status === CandidatureStatus.envoyee ? null : recuLe,
      },
    });
  }
  console.log(`  ✓ ${candidaturesSemaine.length} candidatures sur la semaine en cours`);

  // ── Entretiens ─────────────────────────────────────────────────────────────
  const entretiensSeed = [
    {
      jeuneId: lucasId,
      entreprise: "TechSolutions",
      offreTitre: "Développeur Front-end",
      date: inDays(7),
      heure: "14:00",
      status: EntretienStatus.accepte,
      lienReunion: "https://meet.google.com/abc-defg-hij",
    },
    {
      jeuneId: lucasId,
      entreprise: "Innov'Corp",
      offreTitre: "Product Designer",
      date: inDays(11),
      heure: "10:30",
      status: EntretienStatus.en_attente,
      lienReunion: null,
    },
    {
      jeuneId: aminaId,
      entreprise: "Innov'Corp",
      offreTitre: "Développeur Front-end",
      date: inDays(4),
      heure: "09:00",
      status: EntretienStatus.accepte,
      lienReunion: "https://meet.google.com/xyz-1234-abc",
    },
  ];

  for (const seed of entretiensSeed) {
    const entrepriseId = entrepriseIds.get(seed.entreprise)!;
    const existing = await prisma.entretien.findFirst({
      where: { jeuneId: seed.jeuneId, entrepriseId, offreTitre: seed.offreTitre },
      select: { id: true },
    });
    if (existing) continue;

    await prisma.entretien.create({
      data: {
        jeuneId: seed.jeuneId,
        entrepriseId,
        offreTitre: seed.offreTitre,
        date: seed.date,
        heure: seed.heure,
        status: seed.status,
        lienReunion: seed.lienReunion,
      },
    });
  }
  console.log(`  ✓ ${entretiensSeed.length} entretiens`);

  /* ── Entretiens de la SEMAINE EN COURS ───────────────────────────────────
   *
   * Le bloc ci-dessus place ses rendez-vous « dans 4, 7, 11 jours » : utile
   * pour les listes, inutile pour la courbe hebdomadaire des tableaux de bord,
   * qui ne montre que le lundi → dimanche courant et restait donc quasi vide.
   *
   * Douze rendez-vous répartis sur la semaine, avec la forme qu'a réellement
   * une semaine de recrutement : démarrage lent le lundi, pointe le mercredi et
   * le vendredi, un seul créneau le samedi, rien le dimanche. Une distribution
   * plate ne dirait rien de la lisibilité du graphique.
   *
   * Le STATUT dépend de deux choses :
   *
   *  • la position du jour par rapport à aujourd'hui — un rendez-vous passé est
   *    accepté ou refusé, jamais « en attente de réponse », ce qui n'aurait
   *    aucun sens une fois la date écoulée ;
   *  • le RANG du créneau DANS sa journée, et non le jour lui-même. Une règle
   *    par jour teintait la journée entière d'un coup : trois refus d'affilée le
   *    vendredi, ce qui se lit comme une base cassée plutôt que comme une
   *    semaine. La rotation mélange les statuts à l'intérieur de chaque
   *    journée, et garde deux tiers d'acceptés — la proportion qu'on attend
   *    d'un vrai carnet de rendez-vous.
   */
  const aujourdHui = indexAujourdHui();
  const semaineSeed: {
    jeuneId: string;
    entreprise: string;
    offreTitre: string;
    jour: number;
    heure: string;
  }[] = [
    { jeuneId: lucasId, entreprise: "TechSolutions", offreTitre: "Product Designer", jour: 0, heure: "11:00" },

    { jeuneId: aminaId, entreprise: "Innov'Corp", offreTitre: "Chargé de communication digitale", jour: 1, heure: "09:30" },
    { jeuneId: youssefId, entreprise: "TechSolutions", offreTitre: "Développeur Back-end Node.js", jour: 1, heure: "15:00" },

    { jeuneId: lucasId, entreprise: "Innov'Corp", offreTitre: "Développeur Front-end", jour: 2, heure: "09:00" },
    { jeuneId: aminaId, entreprise: "TechSolutions", offreTitre: "Développeur Back-end Node.js", jour: 2, heure: "11:30" },
    { jeuneId: youssefId, entreprise: "Innov'Corp", offreTitre: "Chargé de communication digitale", jour: 2, heure: "16:00" },

    { jeuneId: lucasId, entreprise: "TechSolutions", offreTitre: "Développeur Back-end Node.js", jour: 3, heure: "10:00" },
    { jeuneId: youssefId, entreprise: "TechSolutions", offreTitre: "Product Designer", jour: 3, heure: "14:30" },

    { jeuneId: aminaId, entreprise: "Innov'Corp", offreTitre: "Développeur Front-end", jour: 4, heure: "09:00" },
    { jeuneId: lucasId, entreprise: "Innov'Corp", offreTitre: "Chargé de communication digitale", jour: 4, heure: "13:00" },
    { jeuneId: youssefId, entreprise: "Innov'Corp", offreTitre: "Développeur Front-end", jour: 4, heure: "17:00" },

    { jeuneId: aminaId, entreprise: "TechSolutions", offreTitre: "Product Designer", jour: 5, heure: "10:30" },
  ];

  // Rang du créneau dans sa journée : c'est lui qui fait tourner les statuts.
  const rangDansLaJournee = new Map<number, number>();

  for (const seed of semaineSeed) {
    const entrepriseId = entrepriseIds.get(seed.entreprise)!;
    const date = jourDeLaSemaine(seed.jour);
    const rang = rangDansLaJournee.get(seed.jour) ?? 0;
    rangDansLaJournee.set(seed.jour, rang + 1);

    // Dédoublonnage sur le CRÉNEAU complet, date et heure comprises : la clé du
    // bloc précédent (jeune + entreprise + intitulé) interdirait deux
    // rendez-vous du même trio à deux jours différents, ce qui est exactement
    // ce que cette semaine met en scène.
    const existing = await prisma.entretien.findFirst({
      where: {
        jeuneId: seed.jeuneId,
        entrepriseId,
        offreTitre: seed.offreTitre,
        date,
        heure: seed.heure,
      },
      select: { id: true },
    });
    if (existing) continue;

    const passe = seed.jour < aujourdHui;
    /*
     * Deux acceptés pour un troisième statut, en rotation sur la journée :
     * un refus derrière soi, une réponse encore attendue devant. Le troisième
     * créneau de chaque journée est donc le seul « différent » — ce qui laisse
     * toujours des rendez-vous confirmés à venir dès qu'un jour de la semaine
     * est encore devant, et alimente la file « à traiter » sans la remplir.
     */
    const status = passe
      ? rang % 3 === 2
        ? EntretienStatus.refuse
        : EntretienStatus.accepte
      : rang % 3 === 2
        ? EntretienStatus.en_attente
        : EntretienStatus.accepte;

    await prisma.entretien.create({
      data: {
        jeuneId: seed.jeuneId,
        entrepriseId,
        offreTitre: seed.offreTitre,
        date,
        heure: seed.heure,
        status,
        lienReunion:
          status === EntretienStatus.accepte ? "https://meet.google.com/o2w-demo-sem" : null,
      },
    });
  }
  console.log(`  ✓ ${semaineSeed.length} entretiens sur la semaine en cours`);

  // ── Questions du test de validation général ────────────────────────────────
  const questionsSeed = [
    {
      enonce: "Quel hook React permet de gérer un effet de bord ?",
      type: QuestionType.qcm,
      options: ["useState", "useEffect", "useMemo", "useRef"],
      bonnesReponses: [1],
      filiere: "Informatique",
    },
    {
      enonce: "TypeScript est un sur-ensemble typé de JavaScript.",
      type: QuestionType.vrai_faux,
      options: ["Vrai", "Faux"],
      bonnesReponses: [0],
      filiere: "Informatique",
    },
    {
      enonce: "Quelle méthode HTTP est idempotente et utilisée pour récupérer des données ?",
      type: QuestionType.qcm,
      options: ["POST", "GET", "PATCH", "DELETE"],
      bonnesReponses: [1],
      filiere: null,
    },
    {
      enonce: "Quelle clause SQL filtre les lignes après un GROUP BY ?",
      type: QuestionType.qcm,
      options: ["WHERE", "HAVING", "ORDER BY", "LIMIT"],
      bonnesReponses: [1],
      filiere: "Data",
    },
    {
      enonce: "Le KPI « taux de conversion » mesure le rapport entre conversions et visites.",
      type: QuestionType.vrai_faux,
      options: ["Vrai", "Faux"],
      bonnesReponses: [0],
      filiere: "Marketing",
    },
    {
      enonce: "Dans un projet, que désigne le « périmètre » ?",
      type: QuestionType.qcm,
      options: ["Le budget", "L'ensemble des livrables attendus", "La durée", "L'équipe"],
      bonnesReponses: [1],
      filiere: null,
    },
    {
      enonce: "Une adresse IPv4 est codée sur 32 bits.",
      type: QuestionType.vrai_faux,
      options: ["Vrai", "Faux"],
      bonnesReponses: [0],
      filiere: "Réseaux et télécommunications",
    },
    {
      enonce: "Que signifie « écoute active » en situation professionnelle ?",
      type: QuestionType.qcm,
      options: [
        "Parler beaucoup",
        "Reformuler pour vérifier sa compréhension",
        "Prendre des notes en silence",
        "Couper la parole",
      ],
      bonnesReponses: [1],
      filiere: null,
    },
    {
      enonce: "Un bilan comptable présente l'actif et le passif d'une entreprise.",
      type: QuestionType.vrai_faux,
      options: ["Vrai", "Faux"],
      bonnesReponses: [0],
      filiere: "Finance",
    },
    {
      enonce: "Quelle est la première étape d'une démarche d'orientation professionnelle ?",
      type: QuestionType.qcm,
      options: [
        "Postuler à des offres",
        "Identifier ses intérêts et compétences",
        "Rédiger un CV",
        "Choisir une entreprise",
      ],
      bonnesReponses: [1],
      filiere: null,
    },
  ];

  /*
   * Une question appartient à un TEST, et il n'y a qu'un test par filière (plus
   * un test commun). Les questions sont donc regroupées par filière, puis
   * rattachées au test correspondant — créé au besoin.
   */
  const parFiliere = new Map<string | null, typeof questionsSeed>();
  for (const seed of questionsSeed) {
    const groupe = parFiliere.get(seed.filiere) ?? [];
    groupe.push(seed);
    parFiliere.set(seed.filiere, groupe);
  }

  for (const [filiere, questions] of parFiliere) {
    const cible = filiereId(filiere);

    const test =
      (await prisma.test.findFirst({ where: { filiereId: cible ?? null } })) ??
      (await prisma.test.create({
        data: {
          titre: filiere ? `Test de validation — ${filiere}` : "Test de validation — commun",
          description: filiere
            ? `Test de validation du compte pour la filière ${filiere}.`
            : "Servi aux candidats dont la filière n'a pas de test propre.",
          filiereId: cible ?? null,
        },
      }));

    for (const [ordre, seed] of questions.entries()) {
      const existing = await prisma.quizQuestion.findFirst({
        where: { enonce: seed.enonce },
        select: { id: true },
      });
      if (existing) continue;

      const { filiere: _filiere, ...rest } = seed;
      await prisma.quizQuestion.create({ data: { ...rest, testId: test.id, ordre } });
    }
  }
  console.log(`  ✓ ${questionsSeed.length} questions réparties en ${parFiliere.size} tests`);

  // ── Notifications ──────────────────────────────────────────────────────────
  const lucasUser = await prisma.jeune.findUnique({
    where: { id: lucasId },
    select: { userId: true },
  });

  if (lucasUser) {
    const existingCount = await prisma.notification.count({ where: { userId: lucasUser.userId } });
    if (existingCount === 0) {
      await prisma.notification.createMany({
        data: [
          {
            userId: lucasUser.userId,
            icon: "business_center",
            title: "TechSolutions a consulté votre profil",
            detail: "Votre profil a retenu l'attention d'un recruteur.",
            href: "/espace-jeune/profil",
            accent: true,
            read: false,
          },
          {
            userId: lucasUser.userId,
            icon: "event_available",
            title: "Entretien confirmé avec TechSolutions",
            detail: "Développeur Front-end, en visio-conférence.",
            href: "/espace-jeune/entretiens",
            accent: true,
            read: false,
          },
          {
            userId: lucasUser.userId,
            icon: "work",
            title: "Nouvelle offre correspondant à votre profil",
            detail: "Développeur Back-end Node.js — TechSolutions, Casablanca.",
            href: "/espace-jeune/offres",
            read: false,
          },
          {
            userId: lucasUser.userId,
            icon: "send",
            title: "Candidature envoyée",
            detail: "Votre candidature à Développeur Front-end a bien été transmise.",
            href: "/espace-jeune/candidatures",
            read: true,
          },
          {
            userId: lucasUser.userId,
            icon: "school",
            title: "Nouvelle formation disponible",
            detail: "« Utiliser LinkedIn pour trouver des opportunités ».",
            href: "/espace-jeune/formations",
            read: true,
          },
          {
            userId: lucasUser.userId,
            icon: "verified",
            title: "Votre profil est validé",
            detail: "Vous avez réussi votre test avec 88 %.",
            href: "/espace-jeune/test",
            read: true,
          },
        ],
      });
    }
  }
  console.log("  ✓ notifications");

  // ── Questions fréquentes ───────────────────────────────────────────────────
  //
  // Amorce éditoriale, pas contenu figé : l'administrateur les modifie, les
  // réordonne ou les supprime depuis le back-office.
  //
  // Les réponses reprennent les règles RÉELLEMENT appliquées par l'API — le
  // seuil vient de la même constante que le contrôle serveur. Un chiffre
  // recopié à la main finirait par contredire la plateforme au premier
  // ajustement.
  //
  // Une question déjà présente n'est pas réécrite : relancer le seed ne doit
  // effacer ni un libellé retouché à la main, ni l'ordre choisi.
  const FAQ_SEED = [
    {
      question: "L'inscription est-elle payante ?",
      reponse:
        "Non. La création de compte, le test de validation et les formations sont gratuits pour les jeunes. Les entreprises partenaires ne paient pas non plus la publication de leurs offres.",
    },
    {
      question: "Le test de validation est-il obligatoire pour postuler ?",
      reponse: `Oui. Tant que votre score est inférieur à ${QUIZ_PASS_SCORE} %, votre profil n'est pas transmis aux recruteurs et les candidatures restent fermées. C'est ce seuil qui garantit aux entreprises que les profils reçus ont déjà été filtrés.`,
    },
    {
      question: "Puis-je repasser le test si je le rate ?",
      reponse:
        "Oui. Prenez le temps de suivre les formations proposées entre deux tentatives : elles couvrent exactement les points évalués, et la progression se voit dès l'essai suivant.",
    },
    {
      question: "Faut-il un CV pour candidater ?",
      reponse:
        "Un CV au format PDF doit être déposé dans vos documents avant toute candidature. Si vous n'en avez pas encore, la formation consacrée au CV vous guide pas à pas pour le construire.",
    },
    {
      question: "Comment une entreprise est-elle validée ?",
      reponse:
        "Chaque compte entreprise est vérifié par l'équipe OMB avant de pouvoir publier. Aucune offre n'est visible sur la plateforme tant que cette vérification n'a pas eu lieu.",
    },
    {
      question: "Que deviennent mes données personnelles ?",
      reponse:
        "Votre profil n'est consultable que par les entreprises validées et par l'administration de la plateforme. Vous pouvez le modifier ou demander la suppression de votre compte à tout moment depuis vos paramètres.",
    },
    {
      question: "Je ne trouve pas ma filière à l'inscription, que faire ?",
      reponse:
        "Saisissez-la : elle est ajoutée au référentiel et proposée aux candidats suivants. Vérifiez simplement l'orthographe, la liste est partagée par tout le monde.",
    },
  ];

  for (const [index, entree] of FAQ_SEED.entries()) {
    const existante = await prisma.faq.findFirst({ where: { question: entree.question } });
    if (!existante) {
      await prisma.faq.create({ data: { ...entree, ordre: index } });
    }
  }
  console.log(`  ✓ ${FAQ_SEED.length} questions fréquentes`);

  console.log("\nComptes de démonstration :");
  console.log(`  admin       ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log(`  jeune       lucas.dupont@email.com / ${DEMO_PASSWORD}`);
  console.log(`  entreprise  recrutement@techsolutions.ma / ${DEMO_PASSWORD}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Échec du seed :", error);
    await prisma.$disconnect();
    process.exit(1);
  });
