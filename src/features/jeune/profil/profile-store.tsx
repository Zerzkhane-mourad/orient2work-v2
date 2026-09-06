"use client";

/**
 * Profil du jeune connecté, adossé à l'API.
 *
 * L'interface est volontairement identique à celle de la version localStorage :
 * les sections d'édition n'ont pas eu à changer. Ce qui change, c'est la source
 * de vérité — c'est désormais le serveur.
 *
 * Deux valeurs ne sont donc PLUS calculées ici : `profilCompletion` et `score`
 * viennent du backend, qui les dérive à chaque lecture. Un client ne peut pas
 * les gonfler.
 *
 * Les mutations sont optimistes : l'UI applique le changement immédiatement,
 * puis se réaligne sur la réponse du serveur — ou revient à l'état précédent si
 * l'appel échoue.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { api } from "@/lib/api";
import { toJeune } from "@/lib/api/adapters";
import { ApiError } from "@/lib/api/errors";
import type { ApiJeune } from "@/lib/api/types";
import type { Experience, Jeune, Lien } from "@/lib/types";

interface ProfileStore {
  jeune: Jeune;
  /** Score d'employabilité (0–100), calculé par le serveur. */
  score: number;
  /** Chargement initial du profil. */
  loading: boolean;
  /** Erreur de chargement (bloquante). */
  error: ApiError | null;
  /** Une mutation est en cours. */
  saving: boolean;
  /** Dernière erreur de sauvegarde (non bloquante, affichée en bandeau). */
  saveError: ApiError | null;
  dismissSaveError: () => void;
  refetch: () => void;

  update: (patch: Partial<Jeune>) => Promise<void>;
  addExperience: (experience: Omit<Experience, "id">) => Promise<void>;
  updateExperience: (id: string, patch: Partial<Experience>) => Promise<void>;
  removeExperience: (id: string) => Promise<void>;
  addLien: (lien: Omit<Lien, "id">) => Promise<void>;
  removeLien: (id: string) => Promise<void>;
  uploadPhoto: (file: File) => Promise<void>;
  uploadBanniere: (file: File) => Promise<void>;

  /** Le cours a été lu jusqu'au bout (§5.4). */
  markFormationLue: (formationId: string) => Promise<void>;
  /** Recharge le profil après validation d'un quiz côté serveur. */
  validerFormation: (formationId: string, scoreQuiz: number) => Promise<void>;
}

const ProfileContext = createContext<ProfileStore | null>(null);

/**
 * Champs que l'API accepte en mise à jour. `status`, `scoreQuiz`, `photo` et
 * `banniere` en sont volontairement absents : les deux premiers sont pilotés
 * par le serveur, les deux autres passent par l'upload de documents.
 */
const EDITABLE_FIELDS = [
  "prenom",
  "nom",
  "telephone",
  "ville",
  "bio",
  "titre",
  "niveauEtudes",
  "etablissement",
  "filiereId",
  "specialite",
  "anneeEtude",
  "diplome",
  "competences",
  "langues",
] as const;

function toUpdatePayload(patch: Partial<Jeune>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (patch[field] !== undefined) payload[field] = patch[field];
  }
  return payload;
}

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<ApiJeune | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<ApiError | null>(null);
  const [nonce, setNonce] = useState(0);

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /**
   * Miroir de `profile` pour l'effet ci-dessous.
   *
   * Le mettre en dépendance rejouerait la requête à chaque réponse reçue, donc
   * en boucle. Une ref donne la valeur courante sans cette dépendance.
   */
  const profileRef = useRef<ApiJeune | null>(null);
  profileRef.current = profile;

  useEffect(() => {
    let active = true;
    setError(null);

    api.jeunes
      .me()
      .then((data) => {
        if (!active) return;
        // Une réponse vide laisserait `profile` à `null`, donc `loading` à
        // `true` pour toujours : l'espace jeune resterait sur son squelette.
        if (data) setProfile(data);
        else setError(new ApiError(0, "INTERNAL_ERROR", "Profil introuvable."));
      })
      .catch((caught: unknown) => {
        if (!active) return;
        const echec =
          caught instanceof ApiError
            ? caught
            : new ApiError(0, "INTERNAL_ERROR", "Chargement du profil impossible.");

        /*
         * Un rechargement de FOND qui échoue ne remplace pas l'écran en cours
         * par une page d'erreur : le profil déjà affiché reste valable, et
         * `ProfileGate` démonterait tout ce que l'utilisateur est en train de
         * faire. L'échec est signalé en bandeau, comme une sauvegarde ratée.
         */
        if (profileRef.current) setSaveError(echec);
        else setError(echec);
      });

    return () => {
      active = false;
    };
  }, [nonce]);

  /*
   * DÉRIVÉ, et non un drapeau : « en chargement » veut dire « rien à afficher »,
   * pas « une requête est en cours ».
   *
   * En le remontant à `true` à chaque `refetch`, `ProfileGate` démontait tout
   * l'espace jeune le temps de l'appel. Le test de validation en mourait :
   * `QuizRunner` rechargeait le profil juste après la correction, se faisait
   * démonter, et remontait à zéro — l'écran de score n'apparaissait jamais et
   * le test semblait recommencer.
   */
  const loading = profile === null && error === null;

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  /**
   * Applique une mutation avec retour en arrière.
   *
   * `optimistic` permet d'afficher le résultat avant la réponse réseau ; en cas
   * d'échec on restaure l'état précédent pour ne jamais laisser l'UI mentir.
   */
  const mutate = useCallback(
    async (action: () => Promise<ApiJeune>, optimistic?: (current: ApiJeune) => ApiJeune) => {
      const previous = profile;
      if (optimistic && previous) setProfile(optimistic(previous));

      setSaving(true);
      setSaveError(null);
      try {
        const updated = await action();
        if (mounted.current) setProfile(updated);
      } catch (caught) {
        if (mounted.current) {
          if (previous) setProfile(previous);
          setSaveError(
            caught instanceof ApiError
              ? caught
              : new ApiError(0, "INTERNAL_ERROR", "Enregistrement impossible."),
          );
        }
      } finally {
        if (mounted.current) setSaving(false);
      }
    },
    [profile],
  );

  const store = useMemo<ProfileStore | null>(() => {
    if (!profile) return null;

    return {
      jeune: toJeune(profile),
      score: profile.score,
      loading,
      error,
      saving,
      saveError,
      dismissSaveError: () => setSaveError(null),
      refetch,

      update: (patch) =>
        mutate(
          () => api.jeunes.update(toUpdatePayload(patch)),
          (current) => ({ ...current, ...toUpdatePayload(patch) }),
        ),

      addExperience: (experience) =>
        mutate(() =>
          api.jeunes.addExperience({
            titre: experience.titre,
            structure: experience.structure,
            periode: experience.periode,
            type: experience.type,
            description: experience.description,
            competences: experience.competences,
          }),
        ),

      updateExperience: (id, patch) => mutate(() => api.jeunes.updateExperience(id, patch)),

      removeExperience: (id) =>
        mutate(
          () => api.jeunes.removeExperience(id),
          (current) => ({
            ...current,
            experiences: current.experiences.filter((e) => e.id !== id),
          }),
        ),

      addLien: (lien) => mutate(() => api.jeunes.addLien({ type: lien.type, url: lien.url })),

      removeLien: (id) =>
        mutate(
          () => api.jeunes.removeLien(id),
          (current) => ({ ...current, liens: current.liens.filter((l) => l.id !== id) }),
        ),

      // L'upload met à jour `jeune.photo` côté serveur : on recharge le profil
      // pour récupérer l'URL du document plutôt que de la reconstruire ici.
      uploadPhoto: (file) =>
        mutate(async () => {
          await api.documents.upload("PHOTO", file);
          return api.jeunes.me();
        }),

      uploadBanniere: (file) =>
        mutate(async () => {
          await api.documents.upload("BANNIERE", file);
          return api.jeunes.me();
        }),

      markFormationLue: (formationId) =>
        mutate(async () => {
          await api.formations.saveProgression(formationId, 100, true);
          return api.jeunes.me();
        }),

      // Le quiz est corrigé côté serveur, qui a déjà enregistré la validation :
      // il ne reste qu'à recharger le profil (le score en dépend).
      validerFormation: () => mutate(() => api.jeunes.me()),
    };
  }, [profile, loading, error, saving, saveError, refetch, mutate]);

  // Le squelette de chargement et l'écran d'erreur sont rendus par les
  // consommateurs (`ProfileGate`), pour que le layout reste maître de la mise
  // en page.
  const value = store ?? {
    jeune: PLACEHOLDER_JEUNE,
    score: 0,
    loading,
    error,
    saving: false,
    saveError: null,
    dismissSaveError: () => undefined,
    refetch,
    update: async () => undefined,
    addExperience: async () => undefined,
    updateExperience: async () => undefined,
    removeExperience: async () => undefined,
    addLien: async () => undefined,
    removeLien: async () => undefined,
    uploadPhoto: async () => undefined,
    uploadBanniere: async () => undefined,
    markFormationLue: async () => undefined,
    validerFormation: async () => undefined,
  };

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

/** Profil vide utilisé pendant le chargement — jamais affiché tel quel. */
const PLACEHOLDER_JEUNE: Jeune = {
  id: "",
  prenom: "",
  nom: "",
  email: "",
  telephone: "",
  ville: "",
  titre: "",
  niveauEtudes: "",
  etablissement: "",
  filiere: "",
  filiereId: null,
  experiences: [],
  competences: [],
  langues: [],
  liens: [],
  status: "inscrit",
  profilCompletion: 0,
  formationsCompletees: 0,
  candidatures: 0,
};

export function useProfile(): ProfileStore {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile doit être utilisé dans un <ProfileProvider>.");
  return ctx;
}

/**
 * Même store, mais `null` hors de l'Espace Jeune — pour les composants (lecteur
 * de cours, quiz) rendus aussi côté public, sans profil connecté.
 */
export function useProfileOptional(): ProfileStore | null {
  return useContext(ProfileContext);
}
