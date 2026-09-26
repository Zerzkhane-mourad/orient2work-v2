/**
 * Opérations PURES sur les listes de notifications.
 *
 * Sorties des composants et du magasin : aucune ne touche au DOM, au réseau ni
 * à React. Elles se lisent seules, et se testent sans monter d'arbre.
 */
import type { Notification } from "@/lib/types";
import { BADGE_MAX, COMPTEUR_MAX } from "../constants";
import type { FiltreLecture, GroupeLecture, GroupePeriode, Periode } from "../types";

const JOUR_MS = 86_400_000;

/* ── Fusion et édition ────────────────────────────────────────────────────── */

/**
 * Fusionne la première page fraîche avec la liste affichée.
 *
 * La page 1 fait foi pour sa fenêtre de dates : ce qui en a disparu a été
 * supprimé ailleurs. Les notifications plus anciennes, chargées par « Afficher
 * plus », sont conservées — sinon un rafraîchissement ramènerait l'utilisateur
 * en haut d'une liste raccourcie.
 */
export function fusionnerPremierePage(
  actuelles: Notification[],
  fraiches: Notification[],
): Notification[] {
  const plusAncienne = fraiches.at(-1)?.createdAt;
  const anterieures = plusAncienne
    ? actuelles.filter((n) => n.createdAt < plusAncienne)
    : [];
  return [...fraiches, ...anterieures];
}

/**
 * Ajoute une page à la suite, sans doublon.
 *
 * Des notifications arrivées entre-temps décalent les pages : la bordure de
 * page peut répéter une ligne déjà affichée.
 */
export function ajouterSansDoublon(
  actuelles: Notification[],
  suivantes: Notification[],
): Notification[] {
  const connues = new Set(actuelles.map((n) => n.id));
  return [...actuelles, ...suivantes.filter((n) => !connues.has(n.id))];
}

/** Réinsère un élément à sa position d'origine, bornée à la longueur actuelle. */
export function reinserer(
  liste: Notification[],
  item: Notification,
  index: number,
): Notification[] {
  const copie = [...liste];
  copie.splice(Math.min(index, copie.length), 0, item);
  return copie;
}

/** Marque lue une notification, ou toutes quand `id` est omis. */
export function marquerLues(liste: Notification[], id?: string): Notification[] {
  return liste.map((n) => (n.read || (id !== undefined && n.id !== id) ? n : { ...n, read: true }));
}

/* ── Filtre ───────────────────────────────────────────────────────────────── */

export function filtrer(liste: Notification[], filtre: FiltreLecture): Notification[] {
  return filtre === "non-lues" ? liste.filter((n) => !n.read) : liste;
}

/* ── Regroupements ────────────────────────────────────────────────────────── */

/** Période d'une date ISO, par rapport à `maintenant` (jour calendaire local). */
export function periodeDe(iso: string, maintenant: Date = new Date()): Periode {
  const debutJour = new Date(
    maintenant.getFullYear(),
    maintenant.getMonth(),
    maintenant.getDate(),
  ).getTime();
  const t = new Date(iso).getTime();
  if (t >= debutJour) return "Aujourd'hui";
  if (t >= debutJour - JOUR_MS) return "Hier";
  if (t >= debutJour - 6 * JOUR_MS) return "Cette semaine";
  return "Plus anciennes";
}

/**
 * Groupes « Aujourd'hui / Hier / Cette semaine / Plus anciennes », dans l'ordre
 * reçu — la liste arrive déjà triée du plus récent au plus ancien.
 */
export function grouperParPeriode(
  liste: Notification[],
  maintenant: Date = new Date(),
): GroupePeriode[] {
  const groupes: GroupePeriode[] = [];
  for (const n of liste) {
    const periode = periodeDe(n.createdAt, maintenant);
    const dernier = groupes.at(-1);
    if (dernier?.periode === periode) dernier.items.push(n);
    else groupes.push({ periode, items: [n] });
  }
  return groupes;
}

/** Groupes de la cloche : non lues d'abord, puis lues — les groupes vides sont omis. */
export function grouperParLecture(liste: Notification[]): GroupeLecture[] {
  const groupes: GroupeLecture[] = [
    { titre: "Nouvelles", neuves: true, items: liste.filter((n) => !n.read) },
    { titre: "Déjà lues", neuves: false, items: liste.filter((n) => n.read) },
  ];
  return groupes.filter((groupe) => groupe.items.length > 0);
}

/* ── Libellés ─────────────────────────────────────────────────────────────── */

/** « 3 » ou « 99+ » — un compteur de filtre. */
export function libelleCompteur(valeur: number): string {
  return valeur > COMPTEUR_MAX ? `${COMPTEUR_MAX}+` : String(valeur);
}

/** « 3 » ou « 9+ » — la pastille posée sur une icône. */
export function libelleBadge(valeur: number): string {
  return valeur > BADGE_MAX ? `${BADGE_MAX}+` : String(valeur);
}

/** « 1 notification non lue », « 3 notifications non lues ». */
export function libelleNonLues(unread: number): string {
  const s = unread > 1 ? "s" : "";
  return `${unread} notification${s} non lue${s}`;
}
