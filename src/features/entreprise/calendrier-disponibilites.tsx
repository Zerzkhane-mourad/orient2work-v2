"use client";

/**
 * Programmation des journées ouvertes, au calendrier.
 *
 * Reprend la disposition de Calendly : un mois à gauche, les horaires à droite.
 * On programme donc là où l'on pense — sur une date — plutôt que dans un
 * formulaire séparé.
 *
 * La SÉLECTION EST MULTIPLE, et c'est le cœur de l'écran. Sans semaine type, il
 * n'existe plus de récurrence : ouvrir un mois demanderait vingt saisies
 * identiques. On coche donc les journées voulues — à la main ou par les
 * raccourcis « Lun–Ven », « semaine prochaine » — puis on applique les mêmes
 * horaires à toutes d'un coup.
 *
 * Rien n'est écrit tant qu'« Appliquer » n'est pas pressé : cliquer une date
 * l'explore, ne l'ouvre pas. Une sélection panachée — journées déjà ouvertes et
 * journées vierges — est donc sans ambiguïté, elles recevront toutes les mêmes
 * horaires.
 *
 * Le passé n'est pas cliquable : programmer une date écoulée n'aurait aucun
 * effet sur les créneaux proposés.
 */
import { useEffect, useMemo, useState } from "react";
import { Button, Icon, type IconName } from "@/components/ui";
import type { ApiDateProgrammee } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const JOURS_COURTS = ["Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam.", "Dim."];

/** Horaires proposés à l'ouverture d'une journée vierge — la matinée type. */
const PLAGE_INITIALE = { debut: "09:00", fin: "12:00" };

type Plage = ApiDateProgrammee["plages"][number];

const minutes = (heure: string): number => {
  const [h, m] = heure.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

const enHeure = (total: number): string =>
  `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;

/** `"12:00"` + 60 → `"13:00"`, borné à 23:59. */
const heurePlusTard = (heure: string, ajoutMin: number): string =>
  enHeure(Math.min(23 * 60 + 59, minutes(heure) + ajoutMin));

/** `YYYY-MM-DD` d'une date locale — jamais `toISOString`, qui passe en UTC. */
function cle(date: Date): string {
  const mois = String(date.getMonth() + 1).padStart(2, "0");
  const jour = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mois}-${jour}`;
}

/** Signature d'un jeu de plages : deux journées « identiques » la partagent. */
const signature = (plages: Plage[]): string =>
  [...plages]
    .sort((a, b) => minutes(a.debut) - minutes(b.debut))
    .map((p) => `${p.debut}-${p.fin}`)
    .join("|");

/** Heures produites par des plages, pour l'aperçu et le décompte. */
function creneauxDe(plages: Plage[], dureeMin: number): string[] {
  const heures = new Set<string>();
  for (const plage of plages) {
    for (let m = minutes(plage.debut); m + dureeMin <= minutes(plage.fin); m += dureeMin) {
      heures.add(enHeure(m));
    }
  }
  return [...heures].sort();
}

/**
 * Grille du mois, alignée sur le lundi.
 *
 * Renvoie des cases vides en tête pour que le 1er tombe dans la bonne colonne.
 */
function grilleDuMois(annee: number, mois: number): Array<Date | null> {
  const premier = new Date(annee, mois, 1);
  // `getDay()` place dimanche à 0 ; on veut lundi en tête.
  const decalage = (premier.getDay() + 6) % 7;
  const nbJours = new Date(annee, mois + 1, 0).getDate();

  return [
    ...Array.from({ length: decalage }, () => null),
    ...Array.from({ length: nbJours }, (_, i) => new Date(annee, mois, i + 1)),
  ];
}

/** Anomalie d'une journée programmée, ou `null`. Miroir des contrôles du serveur. */
export function anomalieDate(entree: ApiDateProgrammee, dureeMin: number): string | null {
  if (entree.plages.length === 0) return "Aucune plage horaire.";

  for (const plage of entree.plages) {
    const duree = minutes(plage.fin) - minutes(plage.debut);
    if (duree <= 0) return "La fin doit suivre le début.";
    if (duree < dureeMin) return `Trop court pour un échange de ${dureeMin} min.`;
  }

  const tri = [...entree.plages].sort((a, b) => minutes(a.debut) - minutes(b.debut));
  if (tri.some((p, i) => i > 0 && minutes(p.debut) < minutes(tri[i - 1]!.fin))) {
    return "Deux plages se chevauchent.";
  }
  return null;
}

const libelleJour = (iso: string, options: Intl.DateTimeFormatOptions) =>
  // Midi : à minuit, un décalage de fuseau ferait afficher la veille.
  new Intl.DateTimeFormat("fr-FR", options).format(new Date(`${iso}T12:00:00`));

interface Props {
  dates: ApiDateProgrammee[];
  onChange: (dates: ApiDateProgrammee[]) => void;
  /** Durée d'un créneau : sert à prévisualiser les heures produites. */
  dureeMin: number;
  /** Fuseau affiché — celui dans lequel les heures sont interprétées. */
  fuseau: string;
}

export function CalendrierDisponibilites({ dates, onChange, dureeMin, fuseau }: Props) {
  const aujourdhui = useMemo(() => {
    const maintenant = new Date();
    maintenant.setHours(0, 0, 0, 0);
    return maintenant;
  }, []);

  const [mois, setMois] = useState(
    () => new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), 1),
  );
  const [selection, setSelection] = useState<string[]>([]);
  const [brouillon, setBrouillon] = useState<Plage[]>([{ ...PLAGE_INITIALE }]);

  const parDate = useMemo(() => new Map(dates.map((d) => [d.date, d])), [dates]);
  const cases = useMemo(() => grilleDuMois(mois.getFullYear(), mois.getMonth()), [mois]);

  /** Horaires déjà en place, quand toute la sélection s'accorde. */
  const communes = useMemo(() => {
    const programmees = selection.map((iso) => parDate.get(iso)).filter(Boolean);
    if (programmees.length === 0 || programmees.length !== selection.length) return null;

    const premiere = signature(programmees[0]!.plages);
    return programmees.every((d) => signature(d!.plages) === premiere) ? programmees[0]!.plages : null;
  }, [selection, parDate]);

  /*
   * Le brouillon repart des horaires en place dès que la sélection s'accorde ;
   * sinon il garde sa valeur, qui sert alors à UNIFORMISER des journées
   * disparates. Recalculer à chaque frappe écraserait la saisie en cours, d'où
   * la dépendance sur la seule signature.
   */
  const signatureCommune = communes ? signature(communes) : null;
  useEffect(() => {
    if (signatureCommune === null) return;
    setBrouillon(communes!.map((plage) => ({ ...plage })));
    // `communes` change d'identité à chaque rendu ; sa signature, non.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signatureCommune]);

  /* ── Sélection ────────────────────────────────────────────────────── */

  const basculer = (iso: string) =>
    setSelection((actuelle) =>
      actuelle.includes(iso) ? actuelle.filter((d) => d !== iso) : [...actuelle, iso].sort(),
    );

  /** Jours du mois affiché qui satisfont un prédicat, passé exclu. */
  const joursDuMois = (garder: (date: Date) => boolean): string[] =>
    cases
      .filter((date): date is Date => date !== null && date >= aujourdhui && garder(date))
      .map(cle);

  const selectionnerSemaine = () => {
    // Lundi à vendredi : la semaine ouvrable, cas de très loin le plus courant.
    const ouvres = joursDuMois((date) => date.getDay() >= 1 && date.getDay() <= 5);
    setSelection(ouvres);
  };

  const selectionnerMemeJour = () => {
    // Tous les jours de la semaine du (ou des) jour(s) déjà retenu(s) : rejoue
    // « tous les mardis » sans réintroduire de récurrence en base.
    const cibles = new Set(selection.map((iso) => new Date(`${iso}T12:00:00`).getDay()));
    if (cibles.size === 0) return;
    setSelection(joursDuMois((date) => cibles.has(date.getDay())));
  };

  /* ── Écriture ─────────────────────────────────────────────────────── */

  const appliquer = () => {
    const retenues = new Set(selection);
    const plages = brouillon.map((plage) => ({ ...plage }));
    onChange(
      [
        ...dates.filter((d) => !retenues.has(d.date)),
        ...selection.map((date) => ({ date, plages: plages.map((p) => ({ ...p })) })),
      ].sort((a, b) => a.date.localeCompare(b.date)),
    );
  };

  const retirerSelection = () => {
    const retenues = new Set(selection);
    onChange(dates.filter((d) => !retenues.has(d.date)));
    setSelection([]);
  };

  const retirer = (date: string) => {
    onChange(dates.filter((d) => d.date !== date));
    setSelection((actuelle) => actuelle.filter((d) => d !== date));
  };

  const changerMois = (pas: number) =>
    setMois((actuel) => new Date(actuel.getFullYear(), actuel.getMonth() + pas, 1));

  /* ── Repères ──────────────────────────────────────────────────────── */

  // Un mois antérieur au mois courant n'a rien de programmable.
  const moisPrecedentPossible =
    mois.getFullYear() > aujourdhui.getFullYear() ||
    (mois.getFullYear() === aujourdhui.getFullYear() && mois.getMonth() > aujourdhui.getMonth());

  const apercu = creneauxDe(brouillon, dureeMin);
  const anomalie = anomalieDate({ date: "", plages: brouillon }, dureeMin);
  const dejaOuvertes = selection.filter((iso) => parDate.has(iso)).length;

  const totalCreneaux = useMemo(
    () => dates.reduce((somme, jour) => somme + creneauxDe(jour.plages, dureeMin).length, 0),
    [dates, dureeMin],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          <h3 className="font-bold text-primary">Dates disponibles</h3>
          <p className="text-sm text-on-surface-variant">
            Sélectionnez une ou plusieurs journées, puis donnez-leur leurs horaires. Seules les
            dates programmées ici sont réservables.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-surface-container px-3 py-1 text-xs font-semibold text-on-surface-variant">
          {dates.length} journée{dates.length > 1 ? "s" : ""} · {totalCreneaux} créneau
          {totalCreneaux > 1 ? "x" : ""}
        </span>
      </div>

      <div className="grid gap-6 rounded-xl border border-outline-variant p-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        {/* ── Mois ───────────────────────────────────────────────────── */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => changerMois(-1)}
              disabled={!moisPrecedentPossible}
              aria-label="Mois précédent"
              className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container disabled:opacity-30"
            >
              <Icon name="chevron_right" className="rotate-180 text-[20px]" />
            </button>

            <p className="font-headline text-lg font-bold text-primary first-letter:uppercase">
              {new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(mois)}
            </p>

            <button
              type="button"
              onClick={() => changerMois(1)}
              aria-label="Mois suivant"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container text-primary hover:bg-surface-container-high"
            >
              <Icon name="chevron_right" className="text-[20px]" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {JOURS_COURTS.map((jour) => (
              <span key={jour} className="pb-2 text-xs font-semibold text-on-surface-variant">
                {jour}
              </span>
            ))}

            {cases.map((date, index) => {
              if (!date) return <span key={`vide-${index}`} />;

              const iso = cle(date);
              const entree = parDate.get(iso);
              const passe = date < aujourdhui;
              const retenue = selection.includes(iso);
              const ouverte = Boolean(entree && entree.plages.length > 0);

              return (
                <button
                  key={iso}
                  type="button"
                  disabled={passe}
                  onClick={() => basculer(iso)}
                  aria-pressed={retenue}
                  aria-label={`${date.getDate()} ${libelleJour(iso, { month: "long" })} — ${
                    ouverte ? "journée ouverte" : "non programmée"
                  }`}
                  className={cn(
                    "relative mx-auto flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary",
                    passe && "cursor-not-allowed text-on-surface-variant/35",
                    // La sélection est un ANNEAU, l'ouverture un FOND : les deux
                    // états se lisent ensemble sur une même case.
                    !passe && retenue && "ring-2 ring-primary ring-offset-1 ring-offset-surface",
                    !passe && ouverte && "bg-secondary-container text-on-secondary-container",
                    !passe && !ouverte && "text-on-surface hover:bg-surface-container",
                  )}
                >
                  {date.getDate()}
                  {/* Nombre de plages : une journée coupée par le déjeuner se
                      distingue d'une matinée simple sans avoir à l'ouvrir. */}
                  {entree && entree.plages.length > 1 && (
                    <span className="absolute bottom-0.5 text-[9px] font-bold leading-none">
                      {entree.plages.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Raccourci onClick={selectionnerSemaine} icon="event_available">
              Lun. → ven.
            </Raccourci>
            <Raccourci
              onClick={selectionnerMemeJour}
              icon="redo"
              disabled={selection.length === 0}
              title="Étendre la sélection à tous les jours de la semaine identiques, ce mois-ci"
            >
              Tous les mêmes jours
            </Raccourci>
            {selection.length > 0 && (
              <Raccourci onClick={() => setSelection([])} icon="close">
                Effacer la sélection
              </Raccourci>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-on-surface-variant">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-secondary-container" /> Journée ouverte
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full ring-2 ring-primary" /> Sélectionnée
            </span>
            <span className="flex items-center gap-1.5">
              <Icon name="public" className="text-[15px]" />
              {fuseau}
            </span>
          </div>
        </div>

        {/* ── Horaires de la sélection ───────────────────────────────── */}
        <div className="space-y-3 border-outline-variant lg:border-l lg:pl-6">
          {selection.length === 0 ? (
            <div className="space-y-2 text-sm text-on-surface-variant">
              <p className="font-semibold text-primary">Aucune date sélectionnée</p>
              <p className="text-xs">
                Cliquez les journées à ouvrir dans le calendrier. Vous pouvez en choisir plusieurs
                et leur donner les mêmes horaires en une fois.
              </p>
            </div>
          ) : (
            <>
              <div>
                <p className="text-sm font-bold text-primary">
                  {selection.length === 1
                    ? libelleJour(selection[0]!, {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })
                    : `${selection.length} journées sélectionnées`}
                </p>
                {selection.length > 1 && (
                  <p className="mt-0.5 text-xs text-on-surface-variant">
                    {dejaOuvertes > 0
                      ? `Dont ${dejaOuvertes} déjà ouverte${dejaOuvertes > 1 ? "s" : ""} — leurs horaires seront remplacés.`
                      : "Elles recevront toutes les mêmes horaires."}
                  </p>
                )}
              </div>

              {brouillon.map((plage, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  <input
                    type="time"
                    value={plage.debut}
                    aria-label={`Plage ${index + 1} — début`}
                    onChange={(e) =>
                      setBrouillon((actuel) =>
                        actuel.map((p, i) => (i === index ? { ...p, debut: e.target.value } : p)),
                      )
                    }
                    className="min-h-11 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-2 text-sm text-on-surface focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
                  />
                  <span className="text-xs text-on-surface-variant">–</span>
                  <input
                    type="time"
                    value={plage.fin}
                    aria-label={`Plage ${index + 1} — fin`}
                    onChange={(e) =>
                      setBrouillon((actuel) =>
                        actuel.map((p, i) => (i === index ? { ...p, fin: e.target.value } : p)),
                      )
                    }
                    className="min-h-11 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-2 text-sm text-on-surface focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
                  />
                  {brouillon.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setBrouillon((actuel) => actuel.filter((_, i) => i !== index))
                      }
                      aria-label={`Retirer la plage ${index + 1}`}
                      className="flex h-11 w-9 shrink-0 items-center justify-center rounded-lg text-on-surface-variant hover:bg-error-container hover:text-error"
                    >
                      <Icon name="close" className="text-[16px]" />
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={() =>
                  setBrouillon((actuel) => {
                    const derniere = actuel[actuel.length - 1];
                    // Enchaîne sur la précédente plutôt que de reproposer la
                    // même plage : « 9h-12h » puis « + » donne « 13h-14h ».
                    const debut = derniere ? heurePlusTard(derniere.fin, 60) : PLAGE_INITIALE.debut;
                    return [...actuel, { debut, fin: heurePlusTard(debut, 60) }];
                  })
                }
                className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                <Icon name="add" className="text-[16px]" /> Ajouter une plage
              </button>

              {anomalie ? (
                <p className="text-xs font-semibold text-error">{anomalie}</p>
              ) : (
                /* Aperçu : ce que le candidat verra réellement. Sans lui, on
                   règle des plages sans savoir combien de rendez-vous elles
                   ouvrent. */
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-on-surface-variant">
                    {apercu.length} créneau{apercu.length > 1 ? "x" : ""} de {dureeMin} min par
                    journée
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {apercu.map((heure) => (
                      <span
                        key={heure}
                        className="rounded border border-outline-variant px-1.5 py-0.5 text-[11px] text-on-surface-variant"
                      >
                        {heure}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1.5 pt-1">
                <Button
                  variant="secondary"
                  size="sm"
                  fullWidth
                  disabled={anomalie !== null}
                  onClick={appliquer}
                >
                  <Icon name="check" className="text-[16px]" />
                  Appliquer à {selection.length} journée{selection.length > 1 ? "s" : ""}
                </Button>
                {dejaOuvertes > 0 && (
                  <Button variant="ghost" size="sm" fullWidth onClick={retirerSelection}>
                    Retirer {dejaOuvertes > 1 ? `ces ${dejaOuvertes} journées` : "cette journée"}
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <ProchainesJournees dates={dates} dureeMin={dureeMin} onRetirer={retirer} />
    </div>
  );
}

/** Bouton discret des raccourcis de sélection. */
function Raccourci({
  onClick,
  icon,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  icon: IconName;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="inline-flex min-h-9 items-center gap-1 rounded-full border border-outline-variant px-3 text-xs font-semibold text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-outline-variant disabled:hover:text-on-surface-variant"
    >
      <Icon name={icon} className="text-[14px]" />
      {children}
    </button>
  );
}

/**
 * Récapitulatif des journées ouvertes, tous mois confondus.
 *
 * Le calendrier n'en montre qu'un mois : sans cette liste, une journée
 * programmée en septembre disparaîtrait de la vue dès qu'on revient en août.
 */
function ProchainesJournees({
  dates,
  dureeMin,
  onRetirer,
}: {
  dates: ApiDateProgrammee[];
  dureeMin: number;
  onRetirer: (date: string) => void;
}) {
  if (dates.length === 0) {
    return (
      <p className="flex items-start gap-2 rounded-lg bg-surface-container px-3 py-2 text-xs text-on-surface-variant">
        <Icon name="info" className="mt-0.5 shrink-0 text-[14px]" />
        Aucune journée ouverte : les candidats ne verront aucun créneau tant que vous n&apos;en
        aurez pas programmé.
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-on-surface-variant">Vos prochaines journées</p>
      <ul className="divide-y divide-outline-variant rounded-xl border border-outline-variant">
        {dates.map((jour) => {
          const anomalie = anomalieDate(jour, dureeMin);
          return (
            <li key={jour.date} className="flex items-center gap-3 px-3 py-2">
              <Icon
                name={anomalie ? "error" : "event_available"}
                className={cn("shrink-0 text-[18px]", anomalie ? "text-error" : "text-secondary")}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-on-surface first-letter:uppercase">
                  {libelleJour(jour.date, { weekday: "long", day: "numeric", month: "long" })}
                </span>
                <span
                  className={cn(
                    "block truncate text-xs",
                    anomalie ? "font-semibold text-error" : "text-on-surface-variant",
                  )}
                >
                  {anomalie ??
                    `${jour.plages.map((p) => `${p.debut}–${p.fin}`).join(", ")} · ${
                      creneauxDe(jour.plages, dureeMin).length
                    } créneaux`}
                </span>
              </span>
              <button
                type="button"
                onClick={() => onRetirer(jour.date)}
                aria-label={`Retirer le ${libelleJour(jour.date, { day: "numeric", month: "long" })}`}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-on-surface-variant hover:bg-error-container hover:text-error"
              >
                <Icon name="close" className="text-[16px]" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
