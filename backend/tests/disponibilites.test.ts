/**
 * Calcul des créneaux réservables.
 *
 * Logique pure, testée sans base : l'horizon, le découpage d'une plage, les
 * créneaux déjà pris et le passé sont les quatre choses qui peuvent faire
 * proposer un rendez-vous impossible à honorer.
 */
import { describe, expect, it } from "vitest";
import {
  chevauchement,
  creneauxOuverts,
  dateLocale,
  enHeure,
  enMinutes,
  problemePlage,
  type DateDisponible,
} from "../src/domain/disponibilites.js";

/** Mercredi 12 août 2026, 08:00 locales. */
const MERCREDI_8H = new Date(2026, 7, 12, 8, 0, 0);

/** Lundi 17 août — cinq jours après la référence, donc dans tout horizon. */
const LUNDI_MATIN: DateDisponible = {
  date: "2026-08-17",
  plages: [{ debut: "09:00", fin: "12:00" }],
};

describe("Conversions horaires", () => {
  it("convertit dans les deux sens", () => {
    expect(enMinutes("09:30")).toBe(570);
    expect(enHeure(570)).toBe("09:30");
    expect(enHeure(0)).toBe("00:00");
  });

  it("refuse une heure mal formée", () => {
    for (const invalide of ["9:00", "0900", "", "24:00", "09:60", "ab:cd"]) {
      expect(enMinutes(invalide)).toBe(-1);
    }
  });

  it("date locale, sans glissement UTC", () => {
    // 23h30 locales : `toISOString()` basculerait au lendemain sur bien des fuseaux.
    expect(dateLocale(new Date(2026, 7, 12, 23, 30))).toBe("2026-08-12");
  });
});

describe("Validité d'une plage", () => {
  it("accepte une plage qui contient au moins un créneau", () => {
    expect(problemePlage({ debut: "09:00", fin: "12:00" }, 30)).toBeNull();
    expect(problemePlage({ debut: "09:00", fin: "09:30" }, 30)).toBeNull();
  });

  it("refuse une fin antérieure ou égale au début", () => {
    expect(problemePlage({ debut: "12:00", fin: "09:00" }, 30)).toContain("suivre");
    expect(problemePlage({ debut: "09:00", fin: "09:00" }, 30)).toContain("suivre");
  });

  it("refuse une plage trop courte pour un créneau", () => {
    expect(problemePlage({ debut: "09:00", fin: "09:20" }, 30)).toContain("30 minutes");
  });
});

describe("Créneaux ouverts", () => {
  const base = { dureeMin: 30, semaines: 2, reserves: [], maintenant: MERCREDI_8H };

  it("découpe la plage en créneaux entiers", () => {
    const journees = creneauxOuverts({ ...base, dates: [LUNDI_MATIN] });
    expect(journees.map((j) => j.date)).toEqual(["2026-08-17"]);
    expect(journees[0]!.creneaux).toEqual([
      "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    ]);
  });

  it("ne propose pas un créneau qui déborde de la plage", () => {
    const journees = creneauxOuverts({
      ...base,
      dureeMin: 45,
      dates: [{ date: "2026-08-17", plages: [{ debut: "09:00", fin: "10:00" }] }],
    });
    // 09:00–09:45 tient ; 09:45–10:30 déborderait.
    expect(journees[0]!.creneaux).toEqual(["09:00"]);
  });

  it("retire les créneaux déjà réservés", () => {
    const journees = creneauxOuverts({
      ...base,
      dates: [LUNDI_MATIN],
      reserves: [
        { date: "2026-08-17", heure: "09:30" },
        { date: "2026-08-17", heure: "11:00" },
      ],
    });
    expect(journees[0]!.creneaux).toEqual(["09:00", "10:00", "10:30", "11:30"]);
  });

  it("écarte les créneaux passés du jour même", () => {
    // Mercredi 8h00, journée programmée 07:00–10:00 : 07:00 et 07:30 sont passés,
    // 08:00 est en cours donc écarté aussi.
    const journees = creneauxOuverts({
      ...base,
      dates: [{ date: "2026-08-12", plages: [{ debut: "07:00", fin: "10:00" }] }],
    });
    expect(journees[0]!.date).toBe("2026-08-12");
    expect(journees[0]!.creneaux).toEqual(["08:30", "09:00", "09:30"]);
  });

  it("omet les journées sans aucun créneau libre", () => {
    const journees = creneauxOuverts({
      ...base,
      dates: [LUNDI_MATIN],
      reserves: ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"].map((heure) => ({
        date: "2026-08-17",
        heure,
      })),
    });
    expect(journees).toEqual([]);
  });

  it("ignore une date déjà passée", () => {
    const journees = creneauxOuverts({
      ...base,
      dates: [{ date: "2026-08-10", plages: [{ debut: "09:00", fin: "12:00" }] }],
    });
    expect(journees).toEqual([]);
  });

  it("respecte l'horizon de réservation", () => {
    // Depuis le mercredi 12, le lundi 17 tombe au 5e jour : déjà dans la semaine.
    const dates: DateDisponible[] = [
      LUNDI_MATIN,
      { date: "2026-08-31", plages: [{ debut: "09:00", fin: "10:00" }] },
    ];

    expect(creneauxOuverts({ ...base, dates, semaines: 1 }).map((j) => j.date)).toEqual([
      "2026-08-17",
    ]);
    expect(creneauxOuverts({ ...base, dates, semaines: 4 }).map((j) => j.date)).toEqual([
      "2026-08-17",
      "2026-08-31",
    ]);
  });

  it("ordonne les journées, quel que soit l'ordre d'enregistrement", () => {
    const journees = creneauxOuverts({
      ...base,
      dates: [
        { date: "2026-08-20", plages: [{ debut: "09:00", fin: "10:00" }] },
        { date: "2026-08-14", plages: [{ debut: "09:00", fin: "10:00" }] },
      ],
    });
    expect(journees.map((j) => j.date)).toEqual(["2026-08-14", "2026-08-20"]);
  });

  it("ne renvoie rien sans date, ni avec des paramètres absurdes", () => {
    expect(creneauxOuverts({ ...base, dates: [] })).toEqual([]);
    expect(creneauxOuverts({ ...base, dates: [LUNDI_MATIN], dureeMin: 0 })).toEqual([]);
    expect(creneauxOuverts({ ...base, dates: [LUNDI_MATIN], semaines: 0 })).toEqual([]);
  });

  it("ignore une journée sans plage", () => {
    const journees = creneauxOuverts({
      ...base,
      dates: [{ date: "2026-08-17", plages: [] }, LUNDI_MATIN],
    });
    expect(journees.map((j) => j.date)).toEqual(["2026-08-17"]);
  });

  it("ignore une plage invalide sans faire échouer les autres journées", () => {
    const journees = creneauxOuverts({
      ...base,
      dates: [
        { date: "2026-08-17", plages: [{ debut: "12:00", fin: "09:00" }] }, // incohérente
        { date: "2026-08-18", plages: [{ debut: "09:00", fin: "10:00" }] },
      ],
    });
    expect(journees.map((j) => j.date)).toEqual(["2026-08-18"]);
  });
});

/**
 * Plusieurs plages le même jour — la forme d'une vraie journée, coupée par le
 * déjeuner. Le regroupement n'en gardait qu'une : l'après-midi disparaissait
 * sans erreur.
 */
describe("Plages multiples le même jour", () => {
  const base = { dureeMin: 60, semaines: 2, reserves: [], maintenant: MERCREDI_8H };

  it("cumule matin et après-midi", () => {
    const journees = creneauxOuverts({
      ...base,
      dates: [
        {
          date: "2026-08-17",
          plages: [
            { debut: "09:00", fin: "12:00" },
            { debut: "14:00", fin: "17:00" },
          ],
        },
      ],
    });
    expect(journees[0]!.creneaux).toEqual(["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"]);
  });

  it("ordonne les créneaux quelle que soit la saisie", () => {
    const journees = creneauxOuverts({
      ...base,
      dates: [
        {
          date: "2026-08-17",
          // Après-midi saisi en premier.
          plages: [
            { debut: "14:00", fin: "16:00" },
            { debut: "09:00", fin: "11:00" },
          ],
        },
      ],
    });
    expect(journees[0]!.creneaux).toEqual(["09:00", "10:00", "14:00", "15:00"]);
  });

  it("ne produit pas de doublon quand deux plages se chevauchent", () => {
    const journees = creneauxOuverts({
      ...base,
      dates: [
        {
          date: "2026-08-17",
          plages: [
            { debut: "09:00", fin: "12:00" },
            { debut: "11:00", fin: "13:00" },
          ],
        },
      ],
    });
    expect(journees[0]!.creneaux).toEqual(["09:00", "10:00", "11:00", "12:00"]);
  });

  it("ignore une plage incohérente sans perdre les autres du même jour", () => {
    const journees = creneauxOuverts({
      ...base,
      dates: [
        {
          date: "2026-08-17",
          plages: [
            { debut: "16:00", fin: "09:00" }, // inversée
            { debut: "09:00", fin: "11:00" },
          ],
        },
      ],
    });
    expect(journees[0]!.creneaux).toEqual(["09:00", "10:00"]);
  });
});

describe("Détection des chevauchements", () => {
  it("accepte des plages disjointes ou bout à bout", () => {
    expect(
      chevauchement([
        { debut: "09:00", fin: "12:00" },
        { debut: "14:00", fin: "17:00" },
      ]),
    ).toBeNull();
    // La borne de fin est exclue : 12:00 n'appartient pas à la première plage.
    expect(
      chevauchement([
        { debut: "09:00", fin: "12:00" },
        { debut: "12:00", fin: "14:00" },
      ]),
    ).toBeNull();
  });

  it("signale un vrai chevauchement", () => {
    const conflit = chevauchement([
      { debut: "09:00", fin: "12:00" },
      { debut: "11:00", fin: "14:00" },
    ]);
    expect(conflit).not.toBeNull();
    expect(conflit?.[0].debut).toBe("09:00");
    expect(conflit?.[1].debut).toBe("11:00");
  });

  it("ne signale rien sur une plage isolée", () => {
    expect(chevauchement([{ debut: "09:00", fin: "12:00" }])).toBeNull();
    expect(chevauchement([])).toBeNull();
  });
});
