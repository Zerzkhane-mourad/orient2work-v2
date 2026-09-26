"use client";

/**
 * Bandeau du prochain entretien confirmé.
 *
 * Un seul rendez-vous compte vraiment : le suivant. Il est donc sorti de la
 * liste et porte les trois choses dont on a besoin dans l'instant — QUAND
 * (compte à rebours, pas une date à calculer de tête), AVEC QUI, et COMMENT
 * s'y rendre : le lien de visio, ou à défaut les consignes laissées par
 * l'entreprise.
 *
 * Ce dernier point manquait : un entretien sur place n'affichait aucune adresse,
 * le message du recruteur restant noyé en petit dans la carte de liste.
 */
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { DUREE_MENU, useTransitionUI } from "@/components/motion/transitions";
import {
  Button,
  ButtonLink,
  Card,
  CardBody,
  Icon,
  type IconName,
  ProgressBar,
} from "@/components/ui";
import type { ApiEntretien } from "@/lib/api/types";
import { cn, formatDate } from "@/lib/utils";
import { echeance } from "./echeance";

export function ProchainEntretien({ entretien }: { entretien: ApiEntretien }) {
  const { libelle, imminent } = echeance(entretien.date);
  const jour = new Date(entretien.date);

  return (
    // `primary-container` : profond dans tous les thèmes. `primary` vire au
    // bleu pâle en thème sombre, sous un texte blanc.
    <Card className="relative overflow-hidden border-0 bg-primary-container text-white shadow-level-2">
      <span
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-secondary-container/25 blur-3xl"
      />
      <CardBody className="relative space-y-4">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="min-w-16 rounded-xl bg-secondary-container p-3 text-center text-on-secondary-container shadow-level-1">
              <p className="text-[10px] font-bold uppercase">
                {jour.toLocaleDateString("fr-FR", {
                  month: "short",
                  timeZone: "UTC",
                })}
              </p>
              <p className="text-2xl font-bold leading-tight">
                {jour.getUTCDate()}
              </p>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-secondary-fixed-dim">
                  Prochain entretien
                </p>
                {/* Le compte à rebours passe en pastille pleine quand c'est
                    pour aujourd'hui ou demain : c'est là qu'il change une
                    décision — préparer ce soir plutôt que la semaine prochaine. */}
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold",
                    imminent
                      ? "bg-secondary text-on-secondary"
                      : "bg-white/15 text-white",
                  )}
                >
                  <Icon
                    name={imminent ? "priority_high" : "timer"}
                    className="text-[13px]"
                  />
                  {libelle} à {entretien.heure}
                </span>
              </div>

              <p className="truncate font-headline text-lg font-bold">
                {entretien.entreprise.nom}
              </p>
              <p className="truncate text-sm text-white/80">
                {entretien.offreTitre} · {formatDate(entretien.date)}
              </p>
            </div>
          </div>

          <div className="shrink-0">
            {entretien.lienReunion ? (
              <ButtonLink
                href={entretien.lienReunion}
                variant="secondary"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon name="video_call" className="text-[18px]" /> Rejoindre
              </ButtonLink>
            ) : (
              /* Pas de lien : l'entretien est sur place, ou le recruteur ne l'a
                 pas encore transmis. Le dire évite d'attendre un bouton qui ne
                 viendra pas. */
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs text-white/85">
                <Icon name="location_on" className="text-[16px]" />
                Sur place ou lien à venir
              </span>
            )}
          </div>
        </div>

        {entretien.commentaire && (
          <p className="relative z-10 flex items-start gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm text-white/90">
            <Icon name="info" className="mt-0.5 shrink-0 text-[16px]" />
            {entretien.commentaire}
          </p>
        )}

        <Icon
          name="event_available"
          className="pointer-events-none absolute -bottom-6 right-4 text-[130px] text-white/5"
        />
      </CardBody>
    </Card>
  );
}

interface EtapePreparation {
  /** Clé stable — c'est elle qui est mémorisée, pas le libellé. */
  cle: string;
  libelle: string;
  icon: IconName;
}

/**
 * Les cinq gestes de préparation, cadrés sur l'entretien qui arrive.
 *
 * Une candidature spontanée n'a PAS d'annonce : son `offreTitre` vaut
 * « Candidature spontanée », et la liste disait alors « Relire l'annonce
 * « Candidature spontanée » » — une consigne impossible. Sans offre, on
 * prépare l'entreprise et ce qu'on veut lui proposer.
 */
function etapesDe(entretien: ApiEntretien | undefined): EtapePreparation[] {
  const nom = entretien?.entreprise.nom;
  const spontanee = entretien?.spontanee ?? false;
  return [
    spontanee
      ? {
          cle: "cible",
          libelle: "Définir le poste ou le stage que vous visez",
          icon: "target",
        }
      : {
          cle: "annonce",
          libelle: entretien
            ? `Relire l'annonce « ${entretien.offreTitre} »`
            : "Relire l'offre et le profil visé",
          icon: "description",
        },
    {
      cle: "entreprise",
      libelle: nom
        ? `Se renseigner sur ${nom}`
        : "Se renseigner sur l'entreprise",
      icon: "business",
    },
    {
      cle: "questions",
      libelle: spontanee
        ? "Préparer 2 questions sur l'entreprise et ses métiers"
        : "Préparer 2 questions sur le poste",
      icon: "help",
    },
    {
      cle: "parcours",
      libelle: "Revoir vos projets et expériences clés",
      icon: "work_history",
    },
    entretien?.lienReunion
      ? {
          cle: "logistique",
          libelle: "Tester votre connexion et votre matériel",
          icon: "video_call",
        }
      : {
          cle: "logistique",
          libelle: "Vérifier le lieu et le temps de trajet",
          icon: "location_on",
        },
  ];
}

/**
 * Préparation de l'entretien, en liste à cocher.
 *
 * Une liste de conseils se lit une fois, puis s'oublie. Cochée, elle devient
 * un suivi : on voit ce qui reste, la barre avance, et l'état est retrouvé en
 * revenant — mémorisé PAR ENTRETIEN, pour qu'une préparation achevée pour l'un
 * ne passe pas pour faite pour le suivant.
 *
 * Mémoire du navigateur seulement : c'est un aide-mémoire personnel, il n'a
 * rien à faire côté serveur ni chez le recruteur.
 */
export function PreparerEntretien({
  entretien,
}: {
  entretien: ApiEntretien | undefined;
}) {
  const etapes = etapesDe(entretien);
  const cleStockage = `preparation-entretien:${entretien?.id ?? "general"}`;
  const [faites, setFaites] = useState<string[]>([]);

  // Lu après le montage : le rendu serveur ne connaît pas le stockage, et le
  // lire pendant le rendu désaccorderait l'hydratation.
  useEffect(() => {
    try {
      const brut = window.localStorage.getItem(cleStockage);
      setFaites(brut ? (JSON.parse(brut) as string[]) : []);
    } catch {
      setFaites([]);
    }
  }, [cleStockage]);

  const basculer = (cle: string) => {
    setFaites((avant) => {
      const suivant = avant.includes(cle)
        ? avant.filter((c) => c !== cle)
        : [...avant, cle];
      try {
        window.localStorage.setItem(cleStockage, JSON.stringify(suivant));
      } catch {
        /* Navigation privée ou stockage bloqué : la liste marche, sans mémoire. */
      }
      return suivant;
    });
  };

  const total = etapes.length;
  const fait = etapes.filter((etape) => faites.includes(etape.cle)).length;
  const pret = fait === total;

  return (
    // Or doux, comme les « Conseil » des autres écrans : une aide, distincte
    // des cartes blanches d'entretiens sans leur faire concurrence.
    <Card className="overflow-hidden border-secondary-container/60 bg-secondary-container/20">
      <CardBody className="space-y-4 p-5">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-300",
              pret
                ? "bg-success text-white"
                : "bg-secondary-container text-on-secondary-container",
            )}
          >
            <Icon
              name={pret ? "verified" : "lightbulb"}
              className="text-[22px]"
            />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-primary">Préparer mon entretien</h3>
            <p className="truncate text-xs text-on-surface-variant">
              {pret
                ? "Vous êtes prêt — bonne chance !"
                : entretien
                  ? `Avec ${entretien.entreprise.nom}`
                  : "Cochez au fur et à mesure"}
            </p>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums",
              pret
                ? "bg-success-container text-on-success-container"
                : "bg-surface-container-lowest text-primary",
            )}
          >
            {fait}/{total}
          </span>
        </div>

        <ProgressBar
          value={(fait / total) * 100}
          className="h-1.5 bg-surface-container-lowest"
          barClassName={cn(
            "duration-500",
            pret ? "bg-success" : "bg-secondary",
          )}
        />

        <ul className="space-y-1.5">
          {etapes.map((etape) => {
            const coche = faites.includes(etape.cle);
            return (
              <li key={etape.cle}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={coche}
                  onClick={() => basculer(etape.cle)}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-all duration-200",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary",
                    coche
                      ? "border-transparent bg-surface-container-lowest/60 text-on-surface-variant"
                      : "border-outline-variant/60 bg-surface-container-lowest text-on-surface shadow-sm hover:-translate-y-px hover:border-secondary-container hover:shadow-level-1",
                  )}
                >
                  {/* Case : vide, puis verte et cochée — l'état se lit sans le
                      texte barré, qui seul serait peu lisible. */}
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-all duration-200",
                      coche
                        ? "scale-100 border-success bg-success text-white"
                        : "border-outline-variant bg-surface-container-lowest text-transparent group-hover:border-secondary",
                    )}
                  >
                    <Icon name="check" className="text-[16px]" />
                  </span>
                  <span
                    className={cn(
                      "min-w-0 flex-1 leading-snug",
                      coche && "line-through decoration-on-surface-variant/50",
                    )}
                  >
                    {etape.libelle}
                  </span>
                  <Icon
                    name={etape.icon}
                    className={cn(
                      "shrink-0 text-[18px] transition-colors",
                      coche ? "text-on-surface-variant/40" : "text-primary/60",
                    )}
                  />
                </button>
              </li>
            );
          })}
        </ul>

        <ButtonLink
          href="/espace-jeune/formations"
          variant={pret ? "outline" : "secondary"}
          size="sm"
          fullWidth
          className="group"
        >
          <Icon name="school" className="text-[16px]" />
          Formation « Réussir son entretien »
          <Icon
            name="arrow_forward"
            className="text-[16px] transition-transform duration-200 group-hover:translate-x-1"
          />
        </ButtonLink>
      </CardBody>
    </Card>
  );
}

/** Compteur d'en-tête de section — le nombre exact, pas celui de la page. */
export function CompteurSection({
  total,
  actif,
}: {
  total: number | undefined;
  /** Met le compteur en évidence : il y a quelque chose à faire. */
  actif?: boolean;
}) {
  if (!total) return null;
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-bold",
        actif
          ? "bg-secondary-container text-on-secondary-container"
          : "bg-surface-container text-on-surface-variant",
      )}
    >
      {total}
    </span>
  );
}

/**
 * Bouton neutre, réservé aux bascules internes à l'écran.
 *
 * Le libellé se remplace en fondu vertical — « Afficher » descend, « Masquer »
 * arrive — et le chevron pivote avec un léger rebond : le geste répond au
 * clic, au lieu d'un texte qui change sèchement de mot.
 */
export function Bascule({
  onClick,
  ouvert,
  children,
}: {
  onClick: () => void;
  ouvert: boolean;
  children: React.ReactNode;
}) {
  const reduire = useReducedMotion();
  const transition = useTransitionUI(DUREE_MENU);

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      aria-expanded={ouvert}
      className={cn("overflow-hidden", ouvert && "bg-primary/10")}
    >
      <span className="relative inline-grid">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={String(ouvert)}
            initial={{ opacity: 0, y: ouvert ? 10 : -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: ouvert ? -10 : 10 }}
            transition={transition}
          >
            {children}
          </motion.span>
        </AnimatePresence>
      </span>
      <motion.span
        className="flex"
        animate={{ rotate: ouvert ? 180 : 0 }}
        transition={
          reduire
            ? { duration: 0 }
            : { type: "spring", stiffness: 380, damping: 22 }
        }
      >
        <Icon name="expand_more" className="text-[18px]" />
      </motion.span>
    </Button>
  );
}
