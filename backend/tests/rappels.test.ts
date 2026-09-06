/**
 * Rappels d'entretien — logique pure.
 *
 * Deux pièges valent d'être verrouillés : l'heure murale n'est pas un instant
 * (elle dépend du fuseau et de l'heure d'été), et la fenêtre de déclenchement
 * doit couvrir l'intervalle entre deux passages du planificateur sans jamais
 * rappeler deux fois ni après coup.
 */
import { describe, expect, it } from "vitest";
import {
  DELAI_RAPPEL_MS,
  doitEnvoyerRappel,
  fenetreDeBalayage,
  instantEntretien,
} from "../src/domain/rappels.js";

const CASA = "Africa/Casablanca";
const PARIS = "Europe/Paris";

describe("Instant réel d'un entretien", () => {
  it("résout l'heure murale dans le fuseau", () => {
    // Casablanca est à UTC+1 en dehors du Ramadan : 14:00 local = 13:00 UTC.
    const instant = instantEntretien("2026-08-19", "14:00", CASA);
    expect(instant?.toISOString()).toBe("2026-08-19T13:00:00.000Z");
  });

  it("suit l'heure d'été du fuseau", () => {
    // Paris : UTC+2 en août, UTC+1 en janvier — même heure murale, deux instants.
    expect(instantEntretien("2026-08-19", "14:00", PARIS)?.toISOString()).toBe(
      "2026-08-19T12:00:00.000Z",
    );
    expect(instantEntretien("2026-01-19", "14:00", PARIS)?.toISOString()).toBe(
      "2026-01-19T13:00:00.000Z",
    );
  });

  it("accepte la `Date` à minuit UTC venue de la base", () => {
    const depuisBase = new Date("2026-08-19T00:00:00.000Z");
    expect(instantEntretien(depuisBase, "09:30", CASA)?.toISOString()).toBe(
      "2026-08-19T08:30:00.000Z",
    );
  });

  it("refuse une entrée inexploitable plutôt que de deviner", () => {
    expect(instantEntretien("2026-08-19", "9:00", CASA)).toBeNull();
    expect(instantEntretien("19-08-2026", "09:00", CASA)).toBeNull();
    expect(instantEntretien("2026-08-19", "24:00", CASA)).toBeNull();
    expect(instantEntretien("2026-08-19", "", CASA)).toBeNull();
  });
});

describe("Fenêtre de déclenchement", () => {
  const debut = new Date("2026-08-19T13:00:00.000Z");
  const tolerance = 5 * 60 * 1000; // balayage toutes les 5 min
  const aMoins = (ms: number) => new Date(debut.getTime() - ms);

  it("déclenche pile à une heure du début", () => {
    expect(doitEnvoyerRappel(debut, aMoins(DELAI_RAPPEL_MS), tolerance)).toBe(true);
  });

  it("déclenche dans la fenêtre du balayage", () => {
    expect(doitEnvoyerRappel(debut, aMoins(DELAI_RAPPEL_MS - 60_000), tolerance)).toBe(true);
    expect(doitEnvoyerRappel(debut, aMoins(DELAI_RAPPEL_MS - tolerance + 1_000), tolerance)).toBe(
      true,
    );
  });

  it("ne déclenche pas trop tôt", () => {
    expect(doitEnvoyerRappel(debut, aMoins(DELAI_RAPPEL_MS + 60_000), tolerance)).toBe(false);
    expect(doitEnvoyerRappel(debut, aMoins(3 * DELAI_RAPPEL_MS), tolerance)).toBe(false);
  });

  it("ne déclenche plus une fois la fenêtre passée", () => {
    // 50 min avant : la fenêtre ]55 ; 60] est derrière nous.
    expect(doitEnvoyerRappel(debut, aMoins(50 * 60 * 1000), tolerance)).toBe(false);
  });

  it("ne rappelle jamais un entretien commencé ou terminé", () => {
    expect(doitEnvoyerRappel(debut, debut, tolerance)).toBe(false);
    expect(doitEnvoyerRappel(debut, new Date(debut.getTime() + 60_000), tolerance)).toBe(false);
  });

  it("couvre l'intervalle sans trou : un balayage régulier attrape tout", () => {
    const tour = 5 * 60 * 1000;
    // On simule 3 heures de balayages toutes les 5 min avant le début.
    let touches = 0;
    for (let t = 3 * DELAI_RAPPEL_MS; t > 0; t -= tour) {
      if (doitEnvoyerRappel(debut, aMoins(t), tour)) touches++;
    }
    // Exactement un passage doit tomber dans la fenêtre.
    expect(touches).toBe(1);
  });
});

describe("Fenêtre de balayage en base", () => {
  it("encadre la veille et le lendemain, aux bornes de jour UTC", () => {
    const { debut, fin } = fenetreDeBalayage(new Date("2026-08-19T13:37:00.000Z"));
    expect(debut.toISOString()).toBe("2026-08-18T00:00:00.000Z");
    expect(fin.toISOString()).toBe("2026-08-21T00:00:00.000Z");
  });
});
