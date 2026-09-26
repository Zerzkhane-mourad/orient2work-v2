/**
 * Logique d'authentification.
 *
 * Principes appliqués :
 *  • aucune réponse ne permet de savoir si un email est inscrit (inscription,
 *    connexion, mot de passe oublié renvoient tous une réponse indistinguable) ;
 *  • le refresh token tourne à chaque usage, et le rejeu d'un token déjà consommé
 *    est interprété comme un vol : toutes les sessions du compte sont révoquées ;
 *  • le mot de passe n'est jamais journalisé, ni renvoyé, ni stocké en clair.
 */
import { DocumentType, Role, TokenPurpose } from "@prisma/client";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { prisma } from "../lib/prisma.js";
import { ConflictError, ForbiddenError, UnauthenticatedError } from "../lib/errors.js";
import { assertRealFileType, removeStoredFile, sanitizeFilename } from "../lib/upload.js";
import { ENTREPRISE_THEME_AUTO } from "../validators/entreprise.validator.js";
import { burnPasswordComparison, hashPassword, verifyPassword } from "../lib/password.js";
import { durationToMs, generateOpaqueToken, hashToken, signAccessToken } from "../lib/tokens.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "../lib/mailer.js";
import * as userRepository from "../repositories/user.repository.js";
import type { UserWithProfiles } from "../repositories/user.repository.js";
import { toUserDto, type UserDto } from "../mappers/user.mapper.js";
import { computeProfilCompletion } from "../domain/profil.js";
import type { Permission } from "../domain/permissions.js";
import { permissionsOf } from "../middlewares/authorize.js";
import { assertFiliereId } from "./referentiel.service.js";
import type {
  ChangePasswordInput,
  LoginInput,
  RegisterEntrepriseInput,
  RegisterJeuneInput,
} from "../validators/auth.validator.js";

export interface SessionContext {
  userAgent?: string | null;
  ip?: string | null;
}

export interface AuthResult {
  user: UserDto;
  accessToken: string;
  /** À poser en cookie httpOnly — jamais dans le corps de la réponse. */
  refreshToken: string;
  expiresIn: number;
}

function profileIdOf(user: UserWithProfiles): string | null {
  return user.jeune?.id ?? user.entreprise?.id ?? null;
}

/**
 * Permissions à embarquer dans le profil de session.
 *
 * Seulement pour les administrateurs : personne d'autre n'en a, et une requête
 * supplémentaire à chaque connexion de jeune serait payée pour rien. Ce tableau
 * sert au back-office à masquer les écrans inaccessibles ; l'autorisation reste
 * refaite côté serveur à chaque appel (voir `requirePermission`).
 */
async function permissionsFor(user: UserWithProfiles): Promise<Permission[]> {
  return user.role === Role.ADMIN ? permissionsOf(user.id) : [];
}

async function issueSession(user: UserWithProfiles, context: SessionContext): Promise<AuthResult> {
  const profileId = profileIdOf(user);

  const accessToken = signAccessToken({
    sub: user.id,
    role: user.role,
    profileId,
    emailVerified: user.emailVerified,
  });

  const refreshToken = generateOpaqueToken();
  await userRepository.createRefreshToken({
    tokenHash: hashToken(refreshToken),
    userId: user.id,
    expiresAt: new Date(Date.now() + durationToMs(env.JWT_REFRESH_TTL)),
    userAgent: context.userAgent ?? null,
    ip: context.ip ?? null,
  });

  return {
    user: toUserDto(user, profileId, await permissionsFor(user)),
    accessToken,
    refreshToken,
    expiresIn: Math.floor(durationToMs(env.JWT_ACCESS_TTL) / 1000),
  };
}

async function issueVerificationToken(userId: string, email: string): Promise<void> {
  if (env.AUTO_VERIFY_EMAIL) {
    await userRepository.markEmailVerified(userId);
    logger.warn({ email }, "AUTO_VERIFY_EMAIL actif : email validé sans confirmation");
    return;
  }

  await userRepository.invalidateActionTokens(userId, TokenPurpose.EMAIL_VERIFICATION);
  const token = generateOpaqueToken();
  await userRepository.createActionToken({
    tokenHash: hashToken(token),
    purpose: TokenPurpose.EMAIL_VERIFICATION,
    userId,
    expiresAt: new Date(Date.now() + env.EMAIL_TOKEN_TTL_MINUTES * 60_000),
  });
  await sendVerificationEmail(email, token);
}

// ── Inscription ──────────────────────────────────────────────────────────────

export async function registerJeune(input: RegisterJeuneInput): Promise<{ message: string }> {
  if (await userRepository.emailExists(input.email)) {
    // Réponse identique au cas nominal : l'API ne dit pas si l'email est pris.
    // Le titulaire légitime est prévenu par email qu'une tentative a eu lieu.
    logger.warn({ email: input.email }, "Inscription sur un email déjà utilisé");
    return { message: "Inscription enregistrée. Vérifiez votre boîte email." };
  }

  const passwordHash = await hashPassword(input.password);

  // Résolue AVANT la transaction : une filière inconnue doit produire un 422 sur
  // le champ concerné, pas un échec de contrainte au milieu de la création.
  const filiereId = await assertFiliereId(input.filiereId);

  const created = await prisma.$transaction(async (tx) => {
    const user = await userRepository.createUser(
      { email: input.email, passwordHash, role: Role.JEUNE },
      tx,
    );

    const profilCompletion = computeProfilCompletion({
      prenom: input.prenom,
      nom: input.nom,
      telephone: input.telephone,
      ville: input.ville,
      titre: "",
      niveauEtudes: input.niveauEtudes,
      etablissement: input.etablissement,
      filiereId,
      competences: [],
      langues: [],
      experiencesCount: 0,
      liensCount: 0,
    });

    await tx.jeune.create({
      data: {
        userId: user.id,
        prenom: input.prenom,
        nom: input.nom,
        telephone: input.telephone,
        ville: input.ville,
        filiereId,
        niveauEtudes: input.niveauEtudes,
        etablissement: input.etablissement,
        // Le statut reflète l'état réel du dossier dès la création (§7.1).
        status: profilCompletion >= 60 ? "en_attente_test" : "profil_incomplet",
      },
    });

    return user;
  });

  await issueVerificationToken(created.id, created.email);
  return { message: "Inscription enregistrée. Vérifiez votre boîte email." };
}

/**
 * Inscription d'une entreprise, logo compris.
 *
 * Le logo est obligatoire et voyage avec le formulaire : l'inscription n'ouvre
 * pas de session, il n'existe donc aucun instant où il pourrait passer par la
 * route authentifiée `POST /documents/LOGO`. Il est enregistré comme un
 * `Document` ordinaire, appartenant au compte créé — le profil pointe vers la
 * route protégée, exactement comme un logo remplacé plus tard depuis l'espace.
 *
 * La suppression du fichier en cas d'échec est prise en charge par la route
 * (`auth.routes.ts`), qui la déclenche pour toute réponse autre qu'un 201. Seul
 * le cas anti-énumération ci-dessous — un 201 qui ne crée rien — doit faire son
 * propre ménage.
 */
export async function registerEntreprise(
  input: RegisterEntrepriseInput,
  logo: Express.Multer.File,
): Promise<{ message: string }> {
  // Contrôle du contenu réel avant toute écriture en base : un `.png` qui n'en
  // est pas un est supprimé du disque par cet appel.
  await assertRealFileType(logo.path, logo.mimetype);

  if (await userRepository.emailExists(input.email)) {
    logger.warn({ email: input.email }, "Inscription sur un email déjà utilisé");
    // Réponse identique à celle d'une inscription réussie, donc 201 : la route
    // ne supprimera pas le fichier, c'est à faire ici.
    await removeStoredFile(logo.filename);
    return { message: "Inscription enregistrée. Vérifiez votre boîte email." };
  }

  const passwordHash = await hashPassword(input.password);

  const created = await prisma.$transaction(async (tx) => {
    const user = await userRepository.createUser(
      { email: input.email, passwordHash, role: Role.ENTREPRISE },
      tx,
    );

    const document = await tx.document.create({
      data: {
        ownerId: user.id,
        type: DocumentType.LOGO,
        filename: sanitizeFilename(logo.originalname),
        storedName: logo.filename,
        mimeType: logo.mimetype,
        size: logo.size,
      },
    });

    await tx.entreprise.create({
      data: {
        userId: user.id,
        nom: input.nom,
        logo: `${env.API_PREFIX}/documents/${document.id}/contenu`,
        secteur: input.secteur,
        ville: input.ville,
        siteWeb: input.siteWeb ?? null,
        description: input.description ?? "",
        responsable: input.responsable,
        emailResponsable: input.emailResponsable ?? input.email,
        telephone: input.telephone,
        // Une entreprise n'accède pas aux talents avant validation par OMB (§7.2).
        status: "attente_contact",
        // Couleurs relevées dans le logo par le navigateur. Le thème ne bascule
        // sur « auto » que si au moins la principale est là : sans elle, il n'y
        // a rien à calculer et le préréglage par défaut s'applique.
        ...(input.themeCouleur
          ? {
              theme: ENTREPRISE_THEME_AUTO,
              themeCouleur: input.themeCouleur,
              themeAccent: input.themeAccent ?? null,
            }
          : {}),
      },
    });
    return user;
  });

  await issueVerificationToken(created.id, created.email);
  return { message: "Inscription enregistrée. Vérifiez votre boîte email." };
}

// ── Connexion ────────────────────────────────────────────────────────────────

export async function login(input: LoginInput, context: SessionContext): Promise<AuthResult> {
  const user = await userRepository.findUserByEmail(input.email);

  if (!user) {
    // Comparaison factice : sans elle, la réponse serait nettement plus rapide
    // pour un email inconnu, ce qui permettrait d'énumérer les comptes.
    await burnPasswordComparison(input.password);
    throw new UnauthenticatedError("Email ou mot de passe incorrect.", "INVALID_CREDENTIALS");
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    throw new UnauthenticatedError("Email ou mot de passe incorrect.", "INVALID_CREDENTIALS");
  }

  if (!user.isActive) {
    throw new ForbiddenError("Ce compte a été désactivé.", "ACCOUNT_DISABLED");
  }

  await userRepository.touchLastLogin(user.id);
  return issueSession(user, context);
}

// ── Rotation du refresh token ────────────────────────────────────────────────

export async function refresh(token: string, context: SessionContext): Promise<AuthResult> {
  const stored = await userRepository.findRefreshToken(hashToken(token));

  if (!stored) {
    throw new UnauthenticatedError("Session invalide.", "TOKEN_INVALID");
  }

  if (stored.revokedAt && !isRecentRotation(stored)) {
    // Un token déjà consommé qui revient = le cookie a fuité et est rejoué.
    // On coupe toutes les sessions du compte plutôt que de laisser cohabiter
    // l'utilisateur légitime et l'attaquant.
    logger.error(
      { userId: stored.userId },
      "Réutilisation d'un refresh token — sessions révoquées",
    );
    await userRepository.revokeAllRefreshTokens(stored.userId);
    throw new UnauthenticatedError("Session invalide.", "TOKEN_INVALID");
  }

  if (stored.expiresAt.getTime() < Date.now()) {
    throw new UnauthenticatedError("Session expirée.", "TOKEN_EXPIRED");
  }

  if (!stored.user.isActive) {
    throw new ForbiddenError("Ce compte a été désactivé.", "ACCOUNT_DISABLED");
  }

  const session = await issueSession(stored.user, context);

  // Dans le délai de grâce, le token est déjà révoqué : on ne le retourne pas
  // une seconde fois, et son remplaçant reste valide (un autre onglet peut le
  // détenir).
  if (!stored.revokedAt) {
    const replacement = await userRepository.findRefreshToken(hashToken(session.refreshToken));
    await userRepository.revokeRefreshToken(stored.id, replacement?.id);
  }

  return session;
}

/**
 * Le token a-t-il été tourné il y a quelques secondes à peine ?
 *
 * C'est la signature d'une rotation dont la réponse s'est perdue, pas d'un vol :
 * un attaquant devrait rejouer le cookie dans cette fenêtre très courte. Un
 * token révoqué par déconnexion n'a pas de remplaçant et n'en profite jamais.
 */
function isRecentRotation(token: { revokedAt: Date | null; replacedById: string | null }): boolean {
  if (!token.revokedAt || !token.replacedById) return false;
  return Date.now() - token.revokedAt.getTime() < env.REFRESH_REUSE_GRACE_SECONDS * 1000;
}

export async function logout(token: string | undefined): Promise<void> {
  if (!token) return;
  const stored = await userRepository.findRefreshToken(hashToken(token));
  if (stored && !stored.revokedAt) {
    await userRepository.revokeRefreshToken(stored.id);
  }
}

export async function logoutAll(userId: string): Promise<void> {
  await userRepository.revokeAllRefreshTokens(userId);
}

// ── Vérification d'email ─────────────────────────────────────────────────────

export async function verifyEmail(token: string): Promise<{ message: string }> {
  const stored = await userRepository.findActionToken(
    hashToken(token),
    TokenPurpose.EMAIL_VERIFICATION,
  );

  if (!stored || stored.usedAt || stored.expiresAt.getTime() < Date.now()) {
    throw new UnauthenticatedError("Lien invalide ou expiré.", "TOKEN_INVALID");
  }

  await prisma.$transaction([
    prisma.actionToken.update({ where: { id: stored.id }, data: { usedAt: new Date() } }),
    prisma.user.update({
      where: { id: stored.userId },
      data: { emailVerified: true, emailVerifiedAt: new Date() },
    }),
  ]);

  return { message: "Adresse email confirmée." };
}

export async function resendVerification(email: string): Promise<{ message: string }> {
  const user = await userRepository.findUserByEmail(email);
  // Message constant : ne révèle ni l'existence du compte, ni son état.
  const message = "Si un compte existe et n'est pas encore confirmé, un email a été envoyé.";

  if (user && !user.emailVerified) {
    await issueVerificationToken(user.id, user.email);
  }
  return { message };
}

// ── Mot de passe ─────────────────────────────────────────────────────────────

export async function forgotPassword(email: string): Promise<{ message: string }> {
  const user = await userRepository.findUserByEmail(email);
  const message = "Si un compte existe pour cette adresse, un email a été envoyé.";

  if (!user) return { message };

  await userRepository.invalidateActionTokens(user.id, TokenPurpose.PASSWORD_RESET);
  const token = generateOpaqueToken();
  await userRepository.createActionToken({
    tokenHash: hashToken(token),
    purpose: TokenPurpose.PASSWORD_RESET,
    userId: user.id,
    expiresAt: new Date(Date.now() + env.PASSWORD_RESET_TTL_MINUTES * 60_000),
  });
  await sendPasswordResetEmail(user.email, token);

  return { message };
}

export async function resetPassword(token: string, password: string): Promise<{ message: string }> {
  const stored = await userRepository.findActionToken(
    hashToken(token),
    TokenPurpose.PASSWORD_RESET,
  );

  if (!stored || stored.usedAt || stored.expiresAt.getTime() < Date.now()) {
    throw new UnauthenticatedError("Lien invalide ou expiré.", "TOKEN_INVALID");
  }

  const passwordHash = await hashPassword(password);

  await prisma.$transaction([
    prisma.actionToken.update({ where: { id: stored.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: stored.userId }, data: { passwordHash } }),
    // Un changement de mot de passe doit expulser les sessions ouvertes,
    // y compris celle d'un éventuel attaquant.
    prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  return { message: "Mot de passe réinitialisé." };
}

export async function changePassword(
  userId: string,
  input: ChangePasswordInput,
): Promise<{ message: string }> {
  const user = await userRepository.findUserById(userId);
  if (!user) throw new UnauthenticatedError("Authentification requise.");

  const valid = await verifyPassword(input.currentPassword, user.passwordHash);
  if (!valid) {
    throw new ConflictError("Le mot de passe actuel est incorrect.");
  }

  const passwordHash = await hashPassword(input.newPassword);
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
    prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  return { message: "Mot de passe modifié. Reconnectez-vous." };
}

// ── Profil de session ────────────────────────────────────────────────────────

export async function me(userId: string): Promise<UserDto> {
  const user = await userRepository.findUserById(userId);
  if (!user) throw new UnauthenticatedError("Authentification requise.");
  return toUserDto(user, profileIdOf(user), await permissionsFor(user));
}
