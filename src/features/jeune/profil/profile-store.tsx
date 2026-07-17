"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { computeProfilCompletion } from "@/lib/profil";
import type { Experience, Jeune, Lien } from "@/lib/types";

const STORAGE_KEY = "o2w:profil";

interface ProfileStore {
  jeune: Jeune;
  /** Patch top-level profile fields. */
  update: (patch: Partial<Jeune>) => void;
  addExperience: (experience: Omit<Experience, "id">) => void;
  updateExperience: (id: string, patch: Partial<Experience>) => void;
  removeExperience: (id: string) => void;
  addLien: (lien: Omit<Lien, "id">) => void;
  removeLien: (id: string) => void;
}

const ProfileContext = createContext<ProfileStore | null>(null);

const newId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

/**
 * Holds the editable profile for the Espace Jeune.
 *
 * Completion is always derived from the profile's contents (never stored stale),
 * and the whole profile is persisted to localStorage so edits survive reloads.
 * Swapping this for API calls later only touches this file.
 */
export function ProfileProvider({ initial, children }: { initial: Jeune; children: React.ReactNode }) {
  const [jeune, setJeune] = useState<Jeune>(initial);

  // Restore any locally saved edits after mount (avoids SSR hydration mismatch).
  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      setJeune({ ...initial, ...(JSON.parse(raw) as Jeune) });
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    // Only on mount: `initial` is the server-rendered seed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep completion in sync with content, then persist.
  const persist = useCallback((next: Jeune) => {
    const withCompletion = { ...next, profilCompletion: computeProfilCompletion(next) };
    setJeune(withCompletion);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(withCompletion));
    } catch {
      // Quota exceeded (large photo + banner as data URLs) — the edit stays live
      // for this session rather than being lost; only the reload survival is dropped.
    }
  }, []);

  const store = useMemo<ProfileStore>(
    () => ({
      jeune,
      update: (patch) => persist({ ...jeune, ...patch }),
      addExperience: (experience) =>
        persist({ ...jeune, experiences: [{ ...experience, id: newId("exp") }, ...jeune.experiences] }),
      updateExperience: (id, patch) =>
        persist({
          ...jeune,
          experiences: jeune.experiences.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        }),
      removeExperience: (id) =>
        persist({ ...jeune, experiences: jeune.experiences.filter((e) => e.id !== id) }),
      addLien: (lien) => persist({ ...jeune, liens: [...jeune.liens, { ...lien, id: newId("lien") }] }),
      removeLien: (id) => persist({ ...jeune, liens: jeune.liens.filter((l) => l.id !== id) }),
    }),
    [jeune, persist],
  );

  return <ProfileContext.Provider value={store}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileStore {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile doit être utilisé dans un <ProfileProvider>.");
  return ctx;
}
