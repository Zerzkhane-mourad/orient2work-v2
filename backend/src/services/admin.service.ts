/**
 * Tableau de bord de l'administration (§7.6).
 *
 * Les tests de validation ont leur propre service (`test.service.ts`) : une
 * question appartient désormais à un test, ce n'est plus une banque à plat.
 */
import * as statsRepository from "../repositories/stats.repository.js";

export function getStats() {
  return statsRepository.computeAdminStats();
}
