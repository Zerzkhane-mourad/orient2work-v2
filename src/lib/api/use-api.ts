"use client";

/**
 * Hooks de consommation de l'API.
 *
 * `useApi` couvre le cas dominant : « je charge une ressource au montage, et
 * l'UI doit afficher un état de chargement, une erreur exploitable, ou la
 * donnée ». Il annule proprement la mise à jour d'état si le composant est
 * démonté avant la réponse — sinon React avertit d'une fuite.
 */
import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { ApiError } from "./errors";

export interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  /** Relance la requête (bouton « Réessayer »). */
  refetch: () => void;
  /**
   * Met à jour la donnée localement après une mutation, sans refetch.
   *
   * Accepte une FONCTION de mise à jour, et pas seulement une valeur : une
   * modification optimiste suivie de la réponse du serveur s'applique en deux
   * temps, et la seconde doit partir de l'état réellement en place — pas de
   * celui capturé à l'ouverture de la fermeture.
   */
  setData: Dispatch<SetStateAction<T | null>>;
}

/**
 * `deps` joue le rôle du tableau de dépendances d'un `useEffect` : la requête
 * est relancée quand l'une des valeurs change (changement de filtre, d'id…).
 */
export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[] = []): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [nonce, setNonce] = useState(0);

  // Garde la dernière version du fetcher sans la mettre en dépendance : une
  // closure recréée à chaque rendu déclencherait une boucle infinie.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    fetcherRef
      .current()
      .then((result) => {
        if (active) setData(result);
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setError(
          caught instanceof ApiError
            ? caught
            : new ApiError(0, "INTERNAL_ERROR", "Une erreur inattendue est survenue."),
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  return { data, loading, error, refetch, setData };
}

export interface UseMutationResult<TArgs extends unknown[], TResult> {
  run: (...args: TArgs) => Promise<TResult | null>;
  pending: boolean;
  error: ApiError | null;
  reset: () => void;
}

/**
 * Action déclenchée par l'utilisateur (soumission de formulaire, candidature…).
 *
 * `run` renvoie `null` en cas d'échec plutôt que de rejeter : l'appelant reste
 * un gestionnaire d'événement simple, sans try/catch, et l'erreur est déjà
 * disponible dans `error` pour l'affichage.
 */
export function useMutation<TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<TResult>,
): UseMutationResult<TArgs, TResult> {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const actionRef = useRef(action);
  actionRef.current = action;

  const run = useCallback(async (...args: TArgs): Promise<TResult | null> => {
    setPending(true);
    setError(null);
    try {
      return await actionRef.current(...args);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught
          : new ApiError(0, "INTERNAL_ERROR", "Une erreur inattendue est survenue."),
      );
      return null;
    } finally {
      setPending(false);
    }
  }, []);

  const reset = useCallback(() => setError(null), []);

  return { run, pending, error, reset };
}
