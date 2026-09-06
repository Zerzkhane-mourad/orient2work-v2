/**
 * `fetch` borné dans le temps.
 *
 * Un `fetch` n'expire pas de lui-même : si le serveur accepte la connexion mais
 * ne répond jamais — conteneur qui démarre, tunnel VPN, proxy qui retient la
 * requête, machine réveillée de veille — la promesse reste en suspens pour
 * toujours. Tout ce qui l'attend reste en suspens avec elle.
 *
 * C'est particulièrement grave sur `/auth/refresh` : l'application entière est
 * derrière cet appel au démarrage, et un écran de chargement sans fin n'offre
 * ni explication ni échappatoire.
 *
 * Le délai est volontairement porté ICI plutôt que dans chaque appelant : deux
 * implémentations finissent toujours par diverger, et c'est exactement ce qui
 * était arrivé — `client.ts` avait la sienne, `session.ts` n'en avait aucune.
 */
import { API_TIMEOUT_MS } from "@/lib/config";
import { ApiError } from "./errors";

/**
 * @param externalSignal Annulation venant de l'appelant (démontage d'un
 * composant), combinée au délai interne.
 * @throws {ApiError} `TIMEOUT` si le délai expire, `NETWORK_ERROR` si la
 * connexion échoue — jamais une `TypeError` brute, que les appelants ne
 * sauraient pas qualifier.
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  externalSignal?: AbortSignal,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  externalSignal?.addEventListener("abort", () => controller.abort(), { once: true });

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    // `AbortError` recouvre les deux annulations possibles ; seule celle du
    // délai mérite d'être présentée comme telle à l'utilisateur.
    const aborted = error instanceof DOMException && error.name === "AbortError";
    throw new ApiError(
      0,
      aborted ? "TIMEOUT" : "NETWORK_ERROR",
      aborted ? "Délai dépassé." : "Serveur injoignable.",
    );
  } finally {
    // Libéré dès l'arrivée des en-têtes : la lecture du corps n'est plus
    // soumise au délai, comme avant cette extraction.
    clearTimeout(timeout);
  }
}
