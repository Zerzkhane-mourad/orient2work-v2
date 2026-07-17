import type { Formation } from "./types";

/**
 * V1 formations are text-based courses authored in the admin rich-text editor.
 * `contenuHtml` holds the rich HTML; `<h2>` headings drive the reader's chapters.
 */
export const formations: Formation[] = [
  {
    id: "f1",
    titre: "Préparer un CV professionnel",
    sousTitre: "Construisez un CV clair et percutant qui décroche des entretiens.",
    description:
      "Ce cours vous guide pas à pas dans la création d'un CV professionnel : structure, mise en page, mots-clés recruteurs et adaptation à chaque offre.",
    categorie: "CV",
    tempsLectureMin: 8,
    note: 4.4,
    nombreAvis: 5,
    niveau: "Débutant",
    instructeur: "Équipe OMB",
    populaire: true,
    progression: 100,
    certifiante: true,
    objectifs: [
      "Structurer un CV professionnel et lisible",
      "Adapter votre CV à chaque offre d'emploi",
      "Utiliser les bons mots-clés pour passer les filtres automatiques",
      "Mettre en valeur vos expériences et compétences",
    ],
    prerequis: ["Aucun prérequis — accessible à tous les jeunes talents"],
    contenuHtml: `
<h2>Pourquoi votre CV est décisif</h2>
<p>Un recruteur consacre en moyenne <strong>moins de dix secondes</strong> à un premier tri de CV. Dans ce laps de temps très court, il cherche à répondre à une seule question : ce profil correspond-il au poste ? Votre CV n'a donc pas vocation à raconter toute votre vie, mais à démontrer rapidement une adéquation.</p>
<p>Beaucoup de jeunes talents ont des expériences réelles et des compétences solides, mais les présentent mal. Le problème n'est presque jamais le manque d'expérience : c'est la manière dont elle est formulée. Un stage bien décrit vaut mieux qu'une longue liste de tâches sans résultat.</p>
<blockquote><p>Règle d'or : chaque ligne de votre CV doit être utile au recruteur. Si une information n'aide pas à comprendre votre valeur pour ce poste, supprimez-la.</p></blockquote>

<h2>La structure d'un CV efficace</h2>
<p>Un CV professionnel suit une structure attendue. Ne réinventez pas l'ordre : le recruteur cherche l'information là où il a l'habitude de la trouver.</p>
<ol>
<li><strong>En-tête</strong> — nom, titre, contact, ville</li>
<li><strong>Accroche</strong> — deux à trois lignes de synthèse</li>
<li><strong>Expériences</strong> — les plus récentes en premier</li>
<li><strong>Formation</strong>, <strong>compétences</strong> et <strong>langues</strong></li>
</ol>
<p>L'en-tête doit contenir un <em>titre clair</em>, pas seulement votre nom. « Étudiant en informatique — recherche alternance développement web » est infiniment plus efficace qu'un simple « CV ». Ce titre oriente immédiatement la lecture.</p>
<p>L'accroche est un court paragraphe qui résume qui vous êtes, ce que vous cherchez et ce que vous apportez. C'est souvent la seule partie réellement lue en entier : soignez-la.</p>

<h2>Décrire ses expériences avec impact</h2>
<p>La faute la plus fréquente est de lister des missions sans résultat. « Participation au développement d'une application » ne dit rien. Préférez une formulation qui montre l'action et l'effet : « Développement de trois écrans d'une application React utilisée par 200 collaborateurs ».</p>
<p>Utilisez la méthode <strong>action + contexte + résultat</strong> :</p>
<ul>
<li>Commencez par un verbe d'action (développé, organisé, analysé)</li>
<li>Précisez le contexte (équipe, outil, durée)</li>
<li>Terminez par un résultat mesurable : un chiffre, un délai, un volume</li>
</ul>
<p>Vos projets académiques et personnels comptent. Si vous manquez d'expérience professionnelle, valorisez-les exactement comme une expérience.</p>

<h2>Adapter son CV à chaque offre</h2>
<p>Un CV générique envoyé à trente entreprises est moins efficace que trois CV adaptés. Relisez l'offre, repérez les mots-clés et assurez-vous qu'ils apparaissent naturellement dans votre CV, s'ils correspondent à la réalité.</p>
<p>De nombreuses entreprises utilisent des outils de filtrage automatique. Un CV au format <strong>PDF</strong>, avec du texte sélectionnable (jamais une image), une police standard et une structure simple, passe ces filtres sans difficulté.</p>
<p>Enfin, faites relire votre CV. Une faute d'orthographe envoie un signal de négligence disproportionné par rapport à sa gravité réelle.</p>
`.trim(),
    quiz: {
      titre: "Quiz — Préparer un CV professionnel",
      description:
        "5 questions pour valider votre maîtrise de la structure, de la formulation et de l'adaptation d'un CV.",
      scoreMinimum: 80,
      questions: [
        {
          id: "f1q1",
          enonce: "Combien de temps un recruteur consacre-t-il en moyenne au premier tri d'un CV ?",
          type: "qcm",
          options: ["Moins de dix secondes", "Environ une minute", "Environ cinq minutes", "Le temps nécessaire"],
          bonneReponse: 0,
          explication:
            "Moins de dix secondes. C'est précisément pour cette raison que le CV doit démontrer immédiatement l'adéquation au poste, et non raconter tout votre parcours.",
          chapitre: "Pourquoi votre CV est décisif",
        },
        {
          id: "f1q2",
          enonce: "Que doit contenir l'en-tête d'un CV, en plus de votre nom et de vos coordonnées ?",
          type: "qcm",
          options: [
            "Une citation inspirante",
            "Un titre clair orientant la lecture",
            "Votre date de naissance",
            "La liste de vos logiciels",
          ],
          bonneReponse: 1,
          explication:
            "Un titre clair. « Étudiant en informatique — recherche alternance développement web » oriente immédiatement le recruteur, là où un simple « CV » ne dit rien.",
          chapitre: "La structure d'un CV efficace",
        },
        {
          id: "f1q3",
          enonce:
            "Quelle formulation décrit une expérience avec le plus d'impact ?",
          type: "qcm",
          options: [
            "« Participation au développement d'une application »",
            "« Stage en développement web de 3 mois »",
            "« Développement de trois écrans d'une application React utilisée par 200 collaborateurs »",
            "« Missions diverses de développement »",
          ],
          bonneReponse: 2,
          explication:
            "La méthode action + contexte + résultat : un verbe d'action, le contexte, puis un résultat mesurable. Les deux autres formulations listent des missions sans montrer l'effet produit.",
          chapitre: "Décrire ses expériences avec impact",
        },
        {
          id: "f1q4",
          enonce:
            "Envoyer un CV sous forme d'image (JPG ou capture d'écran) est une bonne pratique.",
          type: "vrai_faux",
          options: ["Vrai", "Faux"],
          bonneReponse: 1,
          explication:
            "Faux. Les outils de filtrage automatique ne lisent pas les images. Un PDF au texte sélectionnable, avec une police standard et une structure simple, passe ces filtres sans difficulté.",
          chapitre: "Adapter son CV à chaque offre",
        },
        {
          id: "f1q5",
          enonce: "Vous manquez d'expérience professionnelle. Que faire ?",
          type: "qcm",
          options: [
            "Laisser la rubrique expériences vide",
            "Allonger la rubrique formation pour compenser",
            "Valoriser vos projets académiques et personnels comme des expériences",
            "Postuler uniquement à des offres sans expérience requise",
          ],
          bonneReponse: 2,
          explication:
            "Vos projets académiques et personnels comptent : décrivez-les exactement comme une expérience, avec la même méthode action + contexte + résultat.",
          chapitre: "Décrire ses expériences avec impact",
        },
      ],
    },
  },
  {
    id: "f2",
    titre: "Rédiger une lettre de motivation",
    sousTitre: "Personnalisez vos lettres pour chaque opportunité.",
    description:
      "La méthode pour rédiger des lettres de motivation impactantes et personnalisées, qui complètent votre CV et convainquent les recruteurs.",
    categorie: "Lettre de motivation",
    tempsLectureMin: 6,
    note: 4.5,
    nombreAvis: 2,
    niveau: "Débutant",
    instructeur: "Équipe OMB",
    progression: 60,
    certifiante: true,
    objectifs: [
      "Comprendre la structure d'une lettre efficace",
      "Personnaliser votre message pour chaque entreprise",
      "Éviter les erreurs les plus fréquentes",
    ],
    prerequis: ["Avoir un CV à jour (recommandé)"],
    contenuHtml: `
<h2>À quoi sert vraiment une lettre de motivation</h2>
<p>La lettre de motivation ne répète pas le CV : elle <strong>l'explique</strong>. Le CV montre ce que vous avez fait ; la lettre montre pourquoi vous voulez ce poste, dans cette entreprise, et ce que vous allez y apporter.</p>
<p>C'est aussi une démonstration indirecte de vos compétences : votre capacité à écrire clairement, à structurer une idée et à vous adresser à un interlocuteur professionnel.</p>

<h2>La structure en trois temps</h2>
<p>Une lettre efficace tient en trois paragraphes :</p>
<ol>
<li><strong>Vous</strong> (l'entreprise) — pourquoi elle, ce qui vous intéresse dans son activité.</li>
<li><strong>Moi</strong> — une ou deux expériences précises qui prouvent que vous savez faire ce qui est demandé.</li>
<li><strong>Nous</strong> — ce que cette collaboration produirait, et une proposition d'échange.</li>
</ol>
<blockquote><p>Commencer par « Je » est l'erreur classique. Commencez par « Vous ».</p></blockquote>

<h2>Les erreurs à éviter</h2>
<p>Évitez les formules creuses : « dynamique, motivé, rigoureux » n'apporte aucune information car tout le monde l'écrit. <em>Remplacez l'adjectif par la preuve</em> : au lieu de dire que vous êtes rigoureux, racontez en une phrase une situation qui le démontre.</p>
<p>Évitez également la lettre unique envoyée partout. Le recruteur repère immédiatement une lettre générique — et l'interprète comme un manque d'intérêt.</p>
<p>Enfin, restez court : <strong>une page maximum</strong>, idéalement moins.</p>
`.trim(),
    quiz: {
      titre: "Quiz — Rédiger une lettre de motivation",
      description:
        "4 questions pour vérifier que vous maîtrisez la structure en trois temps et les pièges classiques.",
      scoreMinimum: 75,
      questions: [
        {
          id: "f2q1",
          enonce: "Quel est le rôle d'une lettre de motivation par rapport au CV ?",
          type: "qcm",
          options: [
            "Elle répète le CV sous forme rédigée",
            "Elle explique le CV : pourquoi ce poste, cette entreprise, et ce que vous apportez",
            "Elle remplace le CV quand il est trop court",
            "Elle liste vos diplômes en détail",
          ],
          bonneReponse: 1,
          explication:
            "La lettre ne répète pas le CV, elle l'explique. Le CV montre ce que vous avez fait ; la lettre montre pourquoi vous voulez ce poste et ce que vous allez y apporter.",
          chapitre: "À quoi sert vraiment une lettre de motivation",
        },
        {
          id: "f2q2",
          enonce: "Dans quel ordre s'enchaînent les trois paragraphes d'une lettre efficace ?",
          type: "qcm",
          options: ["Moi → Vous → Nous", "Vous → Moi → Nous", "Nous → Moi → Vous", "Moi → Nous → Vous"],
          bonneReponse: 1,
          explication:
            "Vous (l'entreprise), Moi (les preuves), Nous (la collaboration). Commencer par « Je » est l'erreur classique : commencez par « Vous ».",
          chapitre: "La structure en trois temps",
        },
        {
          id: "f2q3",
          enonce: "Écrire « dynamique, motivé et rigoureux » renforce votre candidature.",
          type: "vrai_faux",
          options: ["Vrai", "Faux"],
          bonneReponse: 1,
          explication:
            "Faux. Ces adjectifs n'apportent aucune information puisque tout le monde les écrit. Remplacez l'adjectif par la preuve : racontez en une phrase une situation qui le démontre.",
          chapitre: "Les erreurs à éviter",
        },
        {
          id: "f2q4",
          enonce: "Quelle est la longueur maximale recommandée pour une lettre de motivation ?",
          type: "qcm",
          options: ["Une page maximum, idéalement moins", "Deux pages", "Trois paragraphes par page", "Aucune limite"],
          bonneReponse: 0,
          explication:
            "Une page maximum, idéalement moins. La concision est un signal de clarté : le recruteur doit pouvoir tout lire sans effort.",
          chapitre: "Les erreurs à éviter",
        },
      ],
    },
  },
  {
    id: "f3",
    titre: "Réussir son entretien d'embauche",
    sousTitre: "Abordez vos entretiens avec confiance et méthode.",
    description:
      "Les techniques concrètes pour préparer, gérer et réussir vos entretiens : pitch de présentation, réponses aux questions pièges et suivi post-entretien.",
    categorie: "Entretien",
    tempsLectureMin: 10,
    note: 5.0,
    nombreAvis: 2,
    niveau: "Intermédiaire",
    instructeur: "Équipe OMB",
    populaire: true,
    progression: 30,
    certifiante: true,
    objectifs: [
      "Préparer un pitch de présentation en 2 minutes",
      "Répondre aux questions difficiles avec assurance",
      "Maîtriser votre communication non-verbale",
      "Assurer un suivi professionnel après l'entretien",
    ],
    prerequis: ["Aucun prérequis technique"],
    contenuHtml: `
<h2>Préparer avant d'improviser</h2>
<p>La confiance en entretien ne vient pas du caractère : elle vient de la <strong>préparation</strong>. Un candidat préparé connaît l'entreprise, a relu l'offre, a anticipé cinq questions probables et sait quels exemples il va raconter.</p>
<p>Relisez l'offre et listez, pour chaque compétence demandée, une situation vécue qui la prouve. Ce simple tableau vous donnera une réponse solide à la majorité des questions.</p>

<h2>Le pitch de présentation en deux minutes</h2>
<p>« Parlez-moi de vous » est presque toujours la première question, et la plus mal préparée. Ce n'est pas une invitation à raconter votre biographie : c'est une occasion de <em>cadrer l'entretien</em>.</p>
<ul>
<li><strong>Qui vous êtes</strong> aujourd'hui — formation, spécialité</li>
<li><strong>Ce que vous avez fait</strong> de pertinent — une ou deux expériences liées au poste</li>
<li><strong>Ce que vous cherchez</strong> maintenant — en lien direct avec l'offre</li>
</ul>
<p>Deux minutes suffisent. Entraînez-vous à voix haute jusqu'à ce que ce soit fluide sans être récité.</p>

<h2>Répondre aux questions difficiles</h2>
<p>Pour les questions comportementales, utilisez la méthode <strong>STAR</strong> : Situation, Tâche, Action, Résultat. Ce cadre évite de partir dans tous les sens et donne une réponse complète en une minute.</p>
<p>Sur la question des défauts, ne répondez ni par un faux défaut (« je suis perfectionniste »), ni par un aveu handicapant. Choisissez une difficulté réelle mais non bloquante, et montrez ce que vous avez mis en place pour la gérer.</p>
<blockquote><p>Si vous ne savez pas répondre, dites-le et proposez votre raisonnement. Un recruteur préfère un candidat honnête et structuré à un candidat qui invente.</p></blockquote>

<h2>Poser des questions et assurer le suivi</h2>
<p>À la fin, on vous demandera si vous avez des questions. Répondre « non » est une occasion manquée. Préparez-en deux : sur le contenu du poste, l'équipe, ou la manière dont la réussite est évaluée. Évitez de commencer par la rémunération.</p>
<p>Après l'entretien, envoyez un court message de remerciement <strong>dans les 24 heures</strong>. Peu de candidats le font — cela vous rend mémorable.</p>
`.trim(),
    quiz: {
      titre: "Quiz — Réussir son entretien d'embauche",
      description:
        "6 questions sur la préparation, le pitch, la méthode STAR et le suivi post-entretien.",
      scoreMinimum: 80,
      questions: [
        {
          id: "f3q1",
          enonce: "D'où vient principalement la confiance en entretien ?",
          type: "qcm",
          options: ["Du caractère", "De la préparation", "De l'expérience accumulée", "De la chance"],
          bonneReponse: 1,
          explication:
            "De la préparation. Un candidat préparé connaît l'entreprise, a relu l'offre, a anticipé cinq questions probables et sait quels exemples il va raconter.",
          chapitre: "Préparer avant d'improviser",
        },
        {
          id: "f3q2",
          enonce: "Que signifie l'acronyme STAR ?",
          type: "qcm",
          options: [
            "Situation, Tâche, Action, Résultat",
            "Stratégie, Temps, Analyse, Réponse",
            "Situation, Test, Argument, Réussite",
            "Structure, Thème, Action, Retour",
          ],
          bonneReponse: 0,
          explication:
            "Situation, Tâche, Action, Résultat. Ce cadre structure les réponses aux questions comportementales et donne une réponse complète en une minute.",
          chapitre: "Répondre aux questions difficiles",
        },
        {
          id: "f3q3",
          enonce: "« Parlez-moi de vous » est une invitation à raconter votre parcours depuis le lycée.",
          type: "vrai_faux",
          options: ["Vrai", "Faux"],
          bonneReponse: 1,
          explication:
            "Faux. C'est une occasion de cadrer l'entretien en deux minutes : qui vous êtes aujourd'hui, ce que vous avez fait de pertinent, et ce que vous cherchez — en lien direct avec l'offre.",
          chapitre: "Le pitch de présentation en deux minutes",
        },
        {
          id: "f3q4",
          enonce: "Comment répondre à la question sur vos défauts ?",
          type: "qcm",
          options: [
            "Par un faux défaut comme « je suis perfectionniste »",
            "Par un aveu handicapant pour montrer votre honnêteté",
            "Par une difficulté réelle mais non bloquante, et ce que vous avez mis en place",
            "En expliquant que vous n'en voyez pas",
          ],
          bonneReponse: 2,
          explication:
            "Ni faux défaut, ni aveu handicapant. Choisissez une difficulté réelle mais non bloquante, et montrez surtout ce que vous avez mis en place pour la gérer.",
          chapitre: "Répondre aux questions difficiles",
        },
        {
          id: "f3q5",
          enonce: "En fin d'entretien, on vous demande si vous avez des questions. Que faire ?",
          type: "qcm",
          options: [
            "Répondre « non », tout a été dit",
            "Poser d'abord la question de la rémunération",
            "Poser deux questions préparées sur le poste, l'équipe ou l'évaluation de la réussite",
            "Demander quand vous aurez une réponse",
          ],
          bonneReponse: 2,
          explication:
            "Répondre « non » est une occasion manquée. Préparez deux questions sur le contenu du poste, l'équipe ou la manière dont la réussite est évaluée — et évitez de commencer par la rémunération.",
          chapitre: "Poser des questions et assurer le suivi",
        },
        {
          id: "f3q6",
          enonce: "Dans quel délai envoyer un message de remerciement après l'entretien ?",
          type: "qcm",
          options: ["Dans les 24 heures", "Sous une semaine", "Seulement si on vous relance", "Jamais, c'est déplacé"],
          bonneReponse: 0,
          explication:
            "Dans les 24 heures. Peu de candidats le font, ce qui rend ce court message d'autant plus mémorable.",
          chapitre: "Poser des questions et assurer le suivi",
        },
      ],
    },
  },
  {
    id: "f4",
    titre: "Utiliser LinkedIn pour trouver des opportunités",
    sousTitre: "Optimisez votre profil et développez votre réseau.",
    description:
      "Transformez LinkedIn en véritable moteur de recherche d'opportunités : profil optimisé, réseau ciblé et approche des recruteurs.",
    categorie: "LinkedIn",
    tempsLectureMin: 7,
    note: 4.5,
    nombreAvis: 2,
    niveau: "Tous niveaux",
    instructeur: "Équipe OMB",
    progression: 0,
    certifiante: true,
    objectifs: [
      "Optimiser votre profil pour être visible",
      "Développer un réseau professionnel pertinent",
      "Approcher les recruteurs efficacement",
    ],
    prerequis: ["Disposer d'un compte LinkedIn"],
    contenuHtml: `
<h2>Votre profil est un moteur de recherche</h2>
<p>Sur LinkedIn, les recruteurs ne parcourent pas les profils au hasard : ils effectuent des <strong>recherches par mots-clés</strong>. Votre profil doit donc contenir les termes exacts que l'on utiliserait pour trouver quelqu'un comme vous.</p>
<p>Le titre est le champ le plus important. « Étudiant » ne ressort dans aucune recherche utile. Préférez :</p>
<blockquote><p>Étudiant en informatique | Développement web — React, Node.js | Recherche alternance</p></blockquote>
<p>La photo compte plus qu'on ne le croit : un profil avec photo professionnelle reçoit nettement plus de vues.</p>

<h2>La section « Infos » et les expériences</h2>
<p>La section « Infos » n'est pas un CV en prose : c'est votre <em>argumentaire</em>. Écrivez à la première personne, en paragraphes courts : ce que vous faites, ce qui vous intéresse, ce que vous cherchez, et comment vous contacter.</p>
<p>Décrivez vos expériences comme sur votre CV, avec des résultats concrets. Ajoutez vos projets académiques et personnels : sur LinkedIn, ils sont parfaitement légitimes et montrent votre initiative.</p>

<h2>Développer un réseau utile</h2>
<p>Un réseau utile n'est pas un réseau nombreux. <strong>Ciblez</strong> :</p>
<ul>
<li>Les anciens de votre établissement</li>
<li>Les professionnels de votre filière</li>
<li>Les recruteurs des entreprises qui vous intéressent</li>
</ul>
<p>N'attendez pas de chercher un emploi pour construire votre réseau. Interagissez régulièrement : la visibilité se construit <em>avant</em> le besoin.</p>
<p>Pour approcher un recruteur, soyez direct et court : qui vous êtes, ce que vous cherchez, pourquoi cette entreprise, et une question précise.</p>
`.trim(),
    quiz: {
      titre: "Quiz — Utiliser LinkedIn pour trouver des opportunités",
      description: "4 questions sur l'optimisation du profil et la construction d'un réseau utile.",
      scoreMinimum: 75,
      questions: [
        {
          id: "f4q1",
          enonce: "Comment les recruteurs trouvent-ils des profils sur LinkedIn ?",
          type: "qcm",
          options: [
            "En parcourant les profils au hasard",
            "Par des recherches par mots-clés",
            "Via les suggestions de l'algorithme uniquement",
            "En consultant les listes d'anciens élèves",
          ],
          bonneReponse: 1,
          explication:
            "Par des recherches par mots-clés. Votre profil doit donc contenir les termes exacts que l'on utiliserait pour trouver quelqu'un comme vous.",
          chapitre: "Votre profil est un moteur de recherche",
        },
        {
          id: "f4q2",
          enonce: "Quel titre de profil est le plus efficace ?",
          type: "qcm",
          options: [
            "« Étudiant »",
            "« À la recherche de nouvelles opportunités »",
            "« Étudiant en informatique | Développement web — React, Node.js | Recherche alternance »",
            "« Futur ingénieur passionné »",
          ],
          bonneReponse: 2,
          explication:
            "Le titre est le champ le plus important pour la recherche. « Étudiant » ne ressort dans aucune recherche utile : ajoutez la spécialité, les technologies et l'objectif.",
          chapitre: "Votre profil est un moteur de recherche",
        },
        {
          id: "f4q3",
          enonce: "Un réseau utile est avant tout un réseau nombreux.",
          type: "vrai_faux",
          options: ["Vrai", "Faux"],
          bonneReponse: 1,
          explication:
            "Faux. Un réseau utile est ciblé : les anciens de votre établissement, les professionnels de votre filière et les recruteurs des entreprises qui vous intéressent.",
          chapitre: "Développer un réseau utile",
        },
        {
          id: "f4q4",
          enonce: "Quand faut-il commencer à construire son réseau ?",
          type: "qcm",
          options: [
            "Avant d'en avoir besoin, en interagissant régulièrement",
            "Le jour où l'on commence à chercher un emploi",
            "Après le premier entretien",
            "Une fois diplômé",
          ],
          bonneReponse: 0,
          explication:
            "N'attendez pas de chercher un emploi : la visibilité se construit avant le besoin, par des interactions régulières.",
          chapitre: "Développer un réseau utile",
        },
      ],
    },
  },
  {
    id: "f5",
    titre: "Les fondamentaux du développement web moderne",
    sousTitre: "Formation de spécialité pour les profils développement web.",
    description:
      "Une formation de spécialité pour comprendre les bases du développement web moderne : architecture, composants, données et mise en production.",
    categorie: "Spécialité",
    filiere: "Développement web",
    tempsLectureMin: 12,
    note: 4.5,
    nombreAvis: 2,
    niveau: "Avancé",
    instructeur: "Équipe OMB",
    populaire: true,
    progression: 0,
    certifiante: true,
    objectifs: [
      "Comprendre l'architecture d'une application web moderne",
      "Maîtriser la logique des composants et de l'état",
      "Comprendre le rendu serveur et ses avantages",
      "Connaître les étapes d'une mise en production",
    ],
    prerequis: ["Bases de JavaScript et HTML/CSS"],
    contenuHtml: `
<h2>L'architecture d'une application moderne</h2>
<p>Une application web moderne sépare clairement trois responsabilités :</p>
<ul>
<li><strong>L'interface</strong> — ce que voit l'utilisateur</li>
<li><strong>La logique métier</strong> — les règles de l'application</li>
<li><strong>Les données</strong> — leur stockage et leur accès</li>
</ul>
<p>Mélanger ces couches est la première cause de code difficile à maintenir. Une interface qui contient des règles métier devra être réécrite dès que ces règles changent, alors qu'une couche métier isolée se teste et se modifie indépendamment.</p>

<h2>Penser en composants</h2>
<p>Un composant est une unité d'interface autonome : il reçoit des données en entrée et produit un rendu. La règle essentielle est qu'un composant doit avoir <strong>une seule responsabilité claire</strong> — s'il faut trois phrases pour décrire ce qu'il fait, il en fait trop.</p>
<p>Distinguez les composants de <em>présentation</em> (qui affichent) des composants de <em>logique</em> (qui décident). Cette séparation rend les premiers réutilisables et les seconds testables.</p>

<h2>Gérer l'état et les données</h2>
<p>L'état est ce qui change dans le temps. La règle la plus utile est de le placer <strong>au plus près</strong> de l'endroit où il est utilisé, et de ne le remonter que lorsque plusieurs composants en ont besoin.</p>
<p>Distinguez l'état serveur (les données qui viennent d'une base) de l'état d'interface (un menu ouvert, un onglet actif). Ils n'ont ni le même cycle de vie ni les mêmes besoins de synchronisation, et les confondre crée des bugs difficiles à diagnostiquer.</p>

<h2>Rendu serveur et mise en production</h2>
<p>Le rendu serveur consiste à générer le HTML côté serveur plutôt que dans le navigateur. Les bénéfices sont concrets : la page s'affiche plus vite, elle est indexable par les moteurs de recherche, et l'utilisateur reçoit du contenu utile immédiatement.</p>
<p>Tout n'a pas besoin d'être interactif. Seules les zones réellement interactives nécessitent du JavaScript côté client.</p>
<p>Avant toute mise en production, vérifiez systématiquement : la compilation passe, les types sont corrects, les pages se chargent, et les performances sont mesurées.</p>
`.trim(),
    quiz: {
      titre: "Quiz — Les fondamentaux du développement web moderne",
      description:
        "6 questions sur l'architecture, les composants, la gestion de l'état et le rendu serveur.",
      scoreMinimum: 80,
      questions: [
        {
          id: "f5q1",
          enonce: "Quelles sont les trois responsabilités séparées par une application web moderne ?",
          type: "qcm",
          options: [
            "L'interface, la logique métier et les données",
            "Le HTML, le CSS et le JavaScript",
            "Le client, le serveur et le réseau",
            "Le design, le code et les tests",
          ],
          bonneReponse: 0,
          explication:
            "L'interface (ce que voit l'utilisateur), la logique métier (les règles) et les données (stockage et accès). Mélanger ces couches est la première cause de code difficile à maintenir.",
          chapitre: "L'architecture d'une application moderne",
        },
        {
          id: "f5q2",
          enonce: "Quelle est la règle essentielle pour un composant ?",
          type: "qcm",
          options: [
            "Il doit faire moins de 100 lignes",
            "Il doit avoir une seule responsabilité claire",
            "Il ne doit jamais contenir d'état",
            "Il doit toujours être réutilisable",
          ],
          bonneReponse: 1,
          explication:
            "Une seule responsabilité claire. Le test pratique : s'il faut trois phrases pour décrire ce que fait un composant, il en fait trop.",
          chapitre: "Penser en composants",
        },
        {
          id: "f5q3",
          enonce: "Où placer l'état dans une application ?",
          type: "qcm",
          options: [
            "Toujours dans un store global",
            "Toujours au niveau du composant racine",
            "Au plus près de l'endroit où il est utilisé, remonté seulement si nécessaire",
            "Dans le composant qui l'affiche en dernier",
          ],
          bonneReponse: 2,
          explication:
            "Au plus près de son usage, et remonté uniquement lorsque plusieurs composants en ont besoin. Remonter l'état par défaut complique inutilement l'application.",
          chapitre: "Gérer l'état et les données",
        },
        {
          id: "f5q4",
          enonce: "L'état serveur et l'état d'interface peuvent être gérés de la même manière.",
          type: "vrai_faux",
          options: ["Vrai", "Faux"],
          bonneReponse: 1,
          explication:
            "Faux. Ils n'ont ni le même cycle de vie ni les mêmes besoins de synchronisation. Les confondre crée des bugs difficiles à diagnostiquer.",
          chapitre: "Gérer l'état et les données",
        },
        {
          id: "f5q5",
          enonce: "Quel est un bénéfice concret du rendu serveur ?",
          type: "qcm",
          options: [
            "Il supprime le besoin de JavaScript",
            "La page s'affiche plus vite et devient indexable par les moteurs de recherche",
            "Il réduit la taille de la base de données",
            "Il rend les composants réutilisables",
          ],
          bonneReponse: 1,
          explication:
            "Générer le HTML côté serveur accélère l'affichage, rend la page indexable et livre du contenu utile immédiatement. Seules les zones réellement interactives nécessitent du JavaScript côté client.",
          chapitre: "Rendu serveur et mise en production",
        },
        {
          id: "f5q6",
          enonce: "Que vérifier systématiquement avant une mise en production ?",
          type: "qcm",
          options: [
            "Uniquement que la compilation passe",
            "Uniquement que les tests unitaires passent",
            "Que la compilation passe, les types sont corrects, les pages se chargent et les performances sont mesurées",
            "Que le code a été relu par un collègue",
          ],
          bonneReponse: 2,
          explication:
            "Les quatre vérifications forment un tout : compilation, types, chargement des pages et mesure des performances.",
          chapitre: "Rendu serveur et mise en production",
        },
      ],
    },
  },
];
