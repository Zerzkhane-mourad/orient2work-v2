import { Router } from "express";
import * as controller from "../controllers/notification.controller.js";
import { asyncHandler } from "../lib/http.js";
import { authenticate } from "../middlewares/authenticate.js";
import { validate } from "../middlewares/validate.js";
import { idParamSchema } from "../validators/common.validator.js";
import { listNotificationsSchema } from "../validators/notification.validator.js";

export const notificationRouter = Router();

/**
 * @route GET /notifications
 * @desc Notifications de l'utilisateur connecté + compteur de non-lues.
 * @access Authentifié
 */
notificationRouter.get(
  "/",
  authenticate,
  validate({ query: listNotificationsSchema }),
  asyncHandler(controller.list),
);

/**
 * @route POST /notifications/tout-lu
 * @access Authentifié
 */
notificationRouter.post("/tout-lu", authenticate, asyncHandler(controller.markAllRead));

/**
 * @route POST /notifications/:id/lu
 * @access Authentifié (propriétaire)
 */
notificationRouter.post(
  "/:id/lu",
  authenticate,
  validate({ params: idParamSchema }),
  asyncHandler(controller.markRead),
);

/**
 * @route DELETE /notifications/:id
 * @access Authentifié (propriétaire)
 */
notificationRouter.delete(
  "/:id",
  authenticate,
  validate({ params: idParamSchema }),
  asyncHandler(controller.remove),
);
