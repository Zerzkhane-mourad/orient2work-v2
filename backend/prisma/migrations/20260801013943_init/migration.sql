-- CreateEnum
CREATE TYPE "Role" AS ENUM ('JEUNE', 'ENTREPRISE', 'ADMIN');

-- CreateEnum
CREATE TYPE "JeuneStatus" AS ENUM ('inscrit', 'profil_incomplet', 'en_attente_test', 'test_echoue', 'valide', 'suspendu');

-- CreateEnum
CREATE TYPE "EntrepriseStatus" AS ENUM ('inscrit', 'attente_contact', 'attente_validation', 'valide', 'refuse', 'suspendu');

-- CreateEnum
CREATE TYPE "OffreStatus" AS ENUM ('brouillon', 'attente_validation', 'publiee', 'expiree', 'desactivee');

-- CreateEnum
CREATE TYPE "EntretienStatus" AS ENUM ('en_attente', 'accepte', 'refuse', 'annule');

-- CreateEnum
CREATE TYPE "CandidatureStatus" AS ENUM ('envoyee', 'vue', 'preselectionnee', 'entretien', 'acceptee', 'refusee', 'retiree');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('qcm', 'vrai_faux');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('CV', 'PHOTO', 'BANNIERE', 'LOGO', 'AUTRE');

-- CreateEnum
CREATE TYPE "TokenPurpose" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifiedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "replacedById" UUID,
    "userAgent" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "action_tokens" (
    "id" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "purpose" "TokenPurpose" NOT NULL,
    "userId" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "action_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jeunes" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "prenom" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "telephone" TEXT NOT NULL DEFAULT '',
    "ville" TEXT NOT NULL DEFAULT '',
    "photo" TEXT,
    "banniere" TEXT,
    "bio" TEXT,
    "titre" TEXT NOT NULL DEFAULT '',
    "niveauEtudes" TEXT NOT NULL DEFAULT '',
    "etablissement" TEXT NOT NULL DEFAULT '',
    "filiere" TEXT NOT NULL DEFAULT '',
    "specialite" TEXT,
    "anneeEtude" TEXT,
    "diplome" TEXT,
    "competences" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "langues" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "scoreQuiz" INTEGER,
    "status" "JeuneStatus" NOT NULL DEFAULT 'inscrit',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jeunes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experiences" (
    "id" UUID NOT NULL,
    "jeuneId" UUID NOT NULL,
    "titre" TEXT NOT NULL,
    "structure" TEXT NOT NULL,
    "periode" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "competences" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "liens" (
    "id" UUID NOT NULL,
    "jeuneId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "liens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entreprises" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "nom" TEXT NOT NULL,
    "logo" TEXT,
    "secteur" TEXT NOT NULL DEFAULT '',
    "ville" TEXT NOT NULL DEFAULT '',
    "siteWeb" TEXT,
    "description" TEXT NOT NULL DEFAULT '',
    "responsable" TEXT NOT NULL DEFAULT '',
    "emailResponsable" TEXT NOT NULL DEFAULT '',
    "telephone" TEXT NOT NULL DEFAULT '',
    "status" "EntrepriseStatus" NOT NULL DEFAULT 'inscrit',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entreprises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offres" (
    "id" UUID NOT NULL,
    "entrepriseId" UUID NOT NULL,
    "titre" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "ville" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "niveauDemande" TEXT NOT NULL,
    "filiere" TEXT NOT NULL,
    "competences" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "description" TEXT NOT NULL,
    "dateLimite" DATE NOT NULL,
    "nombrePostes" INTEGER NOT NULL DEFAULT 1,
    "status" "OffreStatus" NOT NULL DEFAULT 'brouillon',
    "publieeLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidatures" (
    "id" UUID NOT NULL,
    "jeuneId" UUID NOT NULL,
    "offreId" UUID NOT NULL,
    "status" "CandidatureStatus" NOT NULL DEFAULT 'envoyee',
    "message" TEXT,
    "cvId" UUID,
    "vueLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "formations" (
    "id" UUID NOT NULL,
    "titre" TEXT NOT NULL,
    "sousTitre" TEXT,
    "description" TEXT NOT NULL,
    "categorie" TEXT NOT NULL,
    "filiere" TEXT,
    "image" TEXT,
    "tempsLectureMin" INTEGER NOT NULL DEFAULT 10,
    "note" DOUBLE PRECISION,
    "nombreAvis" INTEGER NOT NULL DEFAULT 0,
    "niveau" TEXT,
    "instructeur" TEXT,
    "populaire" BOOLEAN NOT NULL DEFAULT false,
    "certifiante" BOOLEAN NOT NULL DEFAULT false,
    "objectifs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "prerequis" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "contenuHtml" TEXT NOT NULL,
    "publiee" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "formations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "formation_quiz" (
    "id" UUID NOT NULL,
    "formationId" UUID NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "scoreMinimum" INTEGER NOT NULL DEFAULT 80,

    CONSTRAINT "formation_quiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "formation_quiz_questions" (
    "id" UUID NOT NULL,
    "quizId" UUID NOT NULL,
    "enonce" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL DEFAULT 'qcm',
    "options" TEXT[],
    "bonneReponse" INTEGER NOT NULL,
    "explication" TEXT NOT NULL DEFAULT '',
    "chapitre" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "formation_quiz_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "formation_progress" (
    "id" UUID NOT NULL,
    "jeuneId" UUID NOT NULL,
    "formationId" UUID NOT NULL,
    "progression" INTEGER NOT NULL DEFAULT 0,
    "lu" BOOLEAN NOT NULL DEFAULT false,
    "luAt" TIMESTAMP(3),
    "valide" BOOLEAN NOT NULL DEFAULT false,
    "valideAt" TIMESTAMP(3),
    "meilleurScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "formation_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avis" (
    "id" UUID NOT NULL,
    "formationId" UUID NOT NULL,
    "jeuneId" UUID NOT NULL,
    "note" INTEGER NOT NULL,
    "commentaire" TEXT NOT NULL DEFAULT '',
    "utile" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "avis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_questions" (
    "id" UUID NOT NULL,
    "enonce" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL DEFAULT 'qcm',
    "options" TEXT[],
    "bonneReponse" INTEGER NOT NULL,
    "filiere" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quiz_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_attempts" (
    "id" UUID NOT NULL,
    "jeuneId" UUID NOT NULL,
    "score" INTEGER NOT NULL,
    "reussi" BOOLEAN NOT NULL,
    "reponses" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entretiens" (
    "id" UUID NOT NULL,
    "jeuneId" UUID NOT NULL,
    "entrepriseId" UUID NOT NULL,
    "offreId" UUID,
    "candidatureId" UUID,
    "offreTitre" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "heure" TEXT NOT NULL,
    "status" "EntretienStatus" NOT NULL DEFAULT 'en_attente',
    "lienReunion" TEXT,
    "commentaire" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entretiens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'notifications',
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "href" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "accent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "type" "DocumentType" NOT NULL,
    "filename" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_replacedById_key" ON "refresh_tokens"("replacedById");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "refresh_tokens_expiresAt_idx" ON "refresh_tokens"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "action_tokens_tokenHash_key" ON "action_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "action_tokens_userId_purpose_idx" ON "action_tokens"("userId", "purpose");

-- CreateIndex
CREATE INDEX "action_tokens_expiresAt_idx" ON "action_tokens"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "jeunes_userId_key" ON "jeunes"("userId");

-- CreateIndex
CREATE INDEX "jeunes_status_idx" ON "jeunes"("status");

-- CreateIndex
CREATE INDEX "jeunes_filiere_idx" ON "jeunes"("filiere");

-- CreateIndex
CREATE INDEX "jeunes_ville_idx" ON "jeunes"("ville");

-- CreateIndex
CREATE INDEX "jeunes_nom_prenom_idx" ON "jeunes"("nom", "prenom");

-- CreateIndex
CREATE INDEX "experiences_jeuneId_idx" ON "experiences"("jeuneId");

-- CreateIndex
CREATE INDEX "liens_jeuneId_idx" ON "liens"("jeuneId");

-- CreateIndex
CREATE UNIQUE INDEX "liens_jeuneId_type_url_key" ON "liens"("jeuneId", "type", "url");

-- CreateIndex
CREATE UNIQUE INDEX "entreprises_userId_key" ON "entreprises"("userId");

-- CreateIndex
CREATE INDEX "entreprises_status_idx" ON "entreprises"("status");

-- CreateIndex
CREATE INDEX "entreprises_ville_idx" ON "entreprises"("ville");

-- CreateIndex
CREATE INDEX "entreprises_secteur_idx" ON "entreprises"("secteur");

-- CreateIndex
CREATE INDEX "offres_status_idx" ON "offres"("status");

-- CreateIndex
CREATE INDEX "offres_entrepriseId_idx" ON "offres"("entrepriseId");

-- CreateIndex
CREATE INDEX "offres_filiere_idx" ON "offres"("filiere");

-- CreateIndex
CREATE INDEX "offres_ville_idx" ON "offres"("ville");

-- CreateIndex
CREATE INDEX "offres_type_idx" ON "offres"("type");

-- CreateIndex
CREATE INDEX "offres_dateLimite_idx" ON "offres"("dateLimite");

-- CreateIndex
CREATE INDEX "offres_status_publieeLe_idx" ON "offres"("status", "publieeLe");

-- CreateIndex
CREATE INDEX "candidatures_offreId_status_idx" ON "candidatures"("offreId", "status");

-- CreateIndex
CREATE INDEX "candidatures_jeuneId_status_idx" ON "candidatures"("jeuneId", "status");

-- CreateIndex
CREATE INDEX "candidatures_createdAt_idx" ON "candidatures"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "candidatures_jeuneId_offreId_key" ON "candidatures"("jeuneId", "offreId");

-- CreateIndex
CREATE INDEX "formations_categorie_idx" ON "formations"("categorie");

-- CreateIndex
CREATE INDEX "formations_filiere_idx" ON "formations"("filiere");

-- CreateIndex
CREATE INDEX "formations_publiee_idx" ON "formations"("publiee");

-- CreateIndex
CREATE INDEX "formations_populaire_idx" ON "formations"("populaire");

-- CreateIndex
CREATE UNIQUE INDEX "formation_quiz_formationId_key" ON "formation_quiz"("formationId");

-- CreateIndex
CREATE INDEX "formation_quiz_questions_quizId_idx" ON "formation_quiz_questions"("quizId");

-- CreateIndex
CREATE INDEX "formation_progress_formationId_idx" ON "formation_progress"("formationId");

-- CreateIndex
CREATE INDEX "formation_progress_jeuneId_valide_idx" ON "formation_progress"("jeuneId", "valide");

-- CreateIndex
CREATE UNIQUE INDEX "formation_progress_jeuneId_formationId_key" ON "formation_progress"("jeuneId", "formationId");

-- CreateIndex
CREATE INDEX "avis_formationId_createdAt_idx" ON "avis"("formationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "avis_formationId_jeuneId_key" ON "avis"("formationId", "jeuneId");

-- CreateIndex
CREATE INDEX "quiz_questions_filiere_active_idx" ON "quiz_questions"("filiere", "active");

-- CreateIndex
CREATE INDEX "quiz_attempts_jeuneId_createdAt_idx" ON "quiz_attempts"("jeuneId", "createdAt");

-- CreateIndex
CREATE INDEX "entretiens_jeuneId_status_idx" ON "entretiens"("jeuneId", "status");

-- CreateIndex
CREATE INDEX "entretiens_entrepriseId_status_idx" ON "entretiens"("entrepriseId", "status");

-- CreateIndex
CREATE INDEX "entretiens_date_idx" ON "entretiens"("date");

-- CreateIndex
CREATE INDEX "notifications_userId_read_idx" ON "notifications"("userId", "read");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "documents_storedName_key" ON "documents"("storedName");

-- CreateIndex
CREATE INDEX "documents_ownerId_type_idx" ON "documents"("ownerId", "type");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_replacedById_fkey" FOREIGN KEY ("replacedById") REFERENCES "refresh_tokens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_tokens" ADD CONSTRAINT "action_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jeunes" ADD CONSTRAINT "jeunes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiences" ADD CONSTRAINT "experiences_jeuneId_fkey" FOREIGN KEY ("jeuneId") REFERENCES "jeunes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liens" ADD CONSTRAINT "liens_jeuneId_fkey" FOREIGN KEY ("jeuneId") REFERENCES "jeunes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entreprises" ADD CONSTRAINT "entreprises_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offres" ADD CONSTRAINT "offres_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "entreprises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidatures" ADD CONSTRAINT "candidatures_jeuneId_fkey" FOREIGN KEY ("jeuneId") REFERENCES "jeunes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidatures" ADD CONSTRAINT "candidatures_offreId_fkey" FOREIGN KEY ("offreId") REFERENCES "offres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidatures" ADD CONSTRAINT "candidatures_cvId_fkey" FOREIGN KEY ("cvId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formation_quiz" ADD CONSTRAINT "formation_quiz_formationId_fkey" FOREIGN KEY ("formationId") REFERENCES "formations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formation_quiz_questions" ADD CONSTRAINT "formation_quiz_questions_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "formation_quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formation_progress" ADD CONSTRAINT "formation_progress_jeuneId_fkey" FOREIGN KEY ("jeuneId") REFERENCES "jeunes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formation_progress" ADD CONSTRAINT "formation_progress_formationId_fkey" FOREIGN KEY ("formationId") REFERENCES "formations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avis" ADD CONSTRAINT "avis_formationId_fkey" FOREIGN KEY ("formationId") REFERENCES "formations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avis" ADD CONSTRAINT "avis_jeuneId_fkey" FOREIGN KEY ("jeuneId") REFERENCES "jeunes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_jeuneId_fkey" FOREIGN KEY ("jeuneId") REFERENCES "jeunes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entretiens" ADD CONSTRAINT "entretiens_jeuneId_fkey" FOREIGN KEY ("jeuneId") REFERENCES "jeunes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entretiens" ADD CONSTRAINT "entretiens_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "entreprises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entretiens" ADD CONSTRAINT "entretiens_offreId_fkey" FOREIGN KEY ("offreId") REFERENCES "offres"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entretiens" ADD CONSTRAINT "entretiens_candidatureId_fkey" FOREIGN KEY ("candidatureId") REFERENCES "candidatures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
