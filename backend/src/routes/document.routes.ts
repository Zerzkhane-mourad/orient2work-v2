/**
 * Documents.
 *
 * Le type d'upload est dans l'URL (`/documents/CV`) plutôt que dans le corps :
 * cela permet de choisir la whitelist MIME AVANT que multer n'écrive quoi que ce
 * soit sur le disque.
 */
import { DocumentType } from "@prisma/client";
import { Router, type NextFunction, type Request, type Response } from "express";
import * as controller from "../controllers/document.controller.js";
import { asyncHandler } from "../lib/http.js";
import { normalizeMulterError, uploadSingle } from "../lib/upload.js";
import { ValidationError } from "../lib/errors.js";
import { authenticate } from "../middlewares/authenticate.js";
import { validate } from "../middlewares/validate.js";
import { idParamSchema } from "../validators/common.validator.js";
import { listDocumentsSchema } from "../validators/notification.validator.js";

export const documentRouter = Router();

/** Adapte le middleware multer au type demandé et normalise ses erreurs. */
function uploadFor(req: Request, res: Response, next: NextFunction): void {
  const type = req.params.type;
  if (!type || !(type in DocumentType)) {
    next(new ValidationError("Type de document inconnu."));
    return;
  }
  uploadSingle(type as DocumentType)(req, res, (error: unknown) => {
    next(error ? normalizeMulterError(error) : undefined);
  });
}

/**
 * @route GET /documents
 * @desc Documents de l'utilisateur connecté.
 * @access Authentifié
 */
documentRouter.get(
  "/",
  authenticate,
  validate({ query: listDocumentsSchema }),
  asyncHandler(controller.list),
);

/**
 * @route POST /documents/:type
 * @desc Dépose un fichier (CV, PHOTO, BANNIERE, LOGO). Type MIME, extension,
 *       signature binaire et taille sont vérifiés.
 * @access Authentifié
 */
documentRouter.post("/:type", authenticate, uploadFor, asyncHandler(controller.upload));

/**
 * @route GET /documents/:id/contenu
 * @desc Télécharge le fichier. Les droits sont revérifiés à chaque appel.
 * @access Propriétaire, entreprise destinataire (CV) ou ADMIN
 */
documentRouter.get(
  "/:id/contenu",
  authenticate,
  validate({ params: idParamSchema }),
  asyncHandler(controller.download),
);

/**
 * @route DELETE /documents/:id
 * @access Propriétaire ou ADMIN
 */
documentRouter.delete(
  "/:id",
  authenticate,
  validate({ params: idParamSchema }),
  asyncHandler(controller.remove),
);
