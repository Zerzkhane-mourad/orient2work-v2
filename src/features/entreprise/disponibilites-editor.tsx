"use client";

/**
 * Réglages de la prise de rendez-vous spontanée.
 *
 * L'entreprise ouvre des JOURNÉES précises — le 12 mars de 9h à 12h — et le
 * serveur en déduit les créneaux réservables. Pas de semaine type : ce qui est
 * affiché au candidat est exactement ce qui a été programmé, sans règle
 * implicite à retenir.
 *
 * Le tout part en BLOC : la liste envoyée remplace les journées à venir. Un
 * envoi différentiel obligerait à distinguer « journée retirée » de « journée
 * non modifiée ».
 *
 * ── Ce qui se perdait en silence ────────────────────────────────────────────
 *
 * Rien n'est écrit tant qu'« Enregistrer » n'est pas pressé — et rien ne le
 * disait. Programmer un mois entier puis revenir à l'agenda, fermer l'onglet ou
 * recharger effaçait tout le travail sans un mot. L'écran signale désormais ses
 * modifications en attente, les défend au déchargement de la page, et les rend
 * annulables.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  ErrorBanner,
  Icon,
  Select,
  SuccessBanner,
  Textarea,
} from "@/components/ui";
import { anomalieDate, CalendrierDisponibilites } from "./calendrier-disponibilites";
import { api } from "@/lib/api";
import type { ApiDateProgrammee, ApiDisponibilites } from "@/lib/api/types";
import { useApi, useMutation } from "@/lib/api/use-api";
import { cn } from "@/lib/utils";

const DUREES = [15, 30, 45, 60, 90, 120];
const HORIZONS = [1, 2, 4, 6, 8, 12];

/**
 * Empreinte d'un jeu de réglages.
 *
 * Comparer les objets ne dirait rien — `dates` est recréé à chaque retouche du
 * calendrier. C'est le CONTENU qui décide s'il y a une modification en attente.
 */
function empreinte(reglages: {
  spontaneeOuverte: boolean;
  creneauDureeMin: number;
  reservationSemaines: number;
  spontaneeMessage: string;
  dates: ApiDateProgrammee[];
}): string {
  return JSON.stringify({
    ...reglages,
    dates: [...reglages.dates]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((jour) => ({
        date: jour.date,
        plages: [...jour.plages]
          .sort((a, b) => a.debut.localeCompare(b.debut))
          .map((plage) => `${plage.debut}-${plage.fin}`),
      })),
  });
}

interface DisponibilitesEditorProps {
  /**
   * Prévient l'écran porteur qu'il reste des modifications non enregistrées —
   * à lui de défendre le changement d'onglet, que ce composant ne voit pas.
   */
  onModificationsChange?: (modifie: boolean) => void;
}

export function DisponibilitesEditor({ onModificationsChange }: DisponibilitesEditorProps) {
  const { data, loading, error, refetch } = useApi(() => api.disponibilites.get(), []);
  const enregistrer = useMutation(api.disponibilites.update);

  const [ouverte, setOuverte] = useState(false);
  const [duree, setDuree] = useState(30);
  const [semaines, setSemaines] = useState(4);
  const [message, setMessage] = useState("");
  const [dates, setDates] = useState<ApiDateProgrammee[]>([]);
  const [enregistre, setEnregistre] = useState(false);

  /** Remet l'écran sur ce que le serveur a renvoyé — au chargement, ou sur annulation. */
  const reprendre = useCallback((reglages: ApiDisponibilites) => {
    setOuverte(reglages.spontaneeOuverte);
    setDuree(reglages.creneauDureeMin);
    setSemaines(reglages.reservationSemaines);
    setMessage(reglages.spontaneeMessage);
    setDates(reglages.dates ?? []);
  }, []);

  useEffect(() => {
    if (data) reprendre(data);
  }, [data, reprendre]);

  const modifie = useMemo(() => {
    if (!data) return false;
    return (
      empreinte({
        spontaneeOuverte: ouverte,
        creneauDureeMin: duree,
        reservationSemaines: semaines,
        spontaneeMessage: message,
        dates,
      }) !==
      empreinte({
        spontaneeOuverte: data.spontaneeOuverte,
        creneauDureeMin: data.creneauDureeMin,
        reservationSemaines: data.reservationSemaines,
        spontaneeMessage: data.spontaneeMessage,
        dates: data.dates ?? [],
      })
    );
  }, [data, ouverte, duree, semaines, message, dates]);

  useEffect(() => {
    onModificationsChange?.(modifie);
  }, [modifie, onModificationsChange]);

  /*
   * Dernier rempart : fermeture de l'onglet, rechargement, lien externe. Le
   * navigateur impose son propre libellé — `preventDefault` suffit à déclencher
   * la demande de confirmation.
   */
  useEffect(() => {
    if (!modifie) return;
    const defendre = (evenement: BeforeUnloadEvent) => evenement.preventDefault();
    window.addEventListener("beforeunload", defendre);
    return () => window.removeEventListener("beforeunload", defendre);
  }, [modifie]);

  /*
   * Contrôlées contre la durée COURANTE : passer de 15 à 60 minutes rend
   * invalides des plages qui ne l'étaient pas. Sans ce recalcul, l'erreur ne se
   * découvrirait qu'au retour du serveur.
   */
  const fautives = useMemo(
    () => dates.filter((entree) => anomalieDate(entree, duree) !== null).length,
    [dates, duree],
  );

  if (loading) {
    return (
      <Card>
        <CardBody className="text-sm text-on-surface-variant">
          Chargement des disponibilités…
        </CardBody>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardBody className="space-y-3">
          <ErrorBanner error={error} />
          <Button variant="outline" onClick={refetch}>
            Réessayer
          </Button>
        </CardBody>
      </Card>
    );
  }

  const soumettre = async () => {
    setEnregistre(false);
    const resultat = await enregistrer.run({
      spontaneeOuverte: ouverte,
      creneauDureeMin: duree,
      reservationSemaines: semaines,
      spontaneeMessage: message,
      dates,
    });
    if (resultat) setEnregistre(true);
  };

  return (
    <Card>
      <CardBody className="space-y-6">
        {/* ── Interrupteur principal ─────────────────────────────────── */}
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-outline-variant p-4 transition-colors hover:bg-surface-container-low">
          <input
            type="checkbox"
            checked={ouverte}
            onChange={(e) => setOuverte(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-outline-variant text-secondary focus:ring-secondary"
          />
          <span>
            <span className="block font-bold text-primary">
              Recevoir des candidatures spontanées
            </span>
            <span className="block text-sm text-on-surface-variant">
              Les jeunes validés voient vos créneaux et réservent un échange. Vous acceptez ou
              déclinez chaque demande.
            </span>
          </span>
        </label>

        {!ouverte && (
          <p className="flex items-start gap-2 rounded-lg bg-surface-container px-3 py-2 text-xs text-on-surface-variant">
            <Icon name="info" className="mt-0.5 shrink-0 text-[14px]" />
            Vos journées sont enregistrées mais invisibles tant que la case ci-dessus n&apos;est
            pas cochée.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Durée d'un échange"
            value={String(duree)}
            onChange={(v) => setDuree(Number(v))}
            options={DUREES.map((d) => ({ value: String(d), label: `${d} minutes` }))}
            hint="Découpe chaque plage en créneaux."
          />
          <Select
            label="Réservation ouverte sur"
            value={String(semaines)}
            onChange={(v) => setSemaines(Number(v))}
            options={HORIZONS.map((s) => ({
              value: String(s),
              label: `${s} semaine${s > 1 ? "s" : ""}`,
            }))}
            hint="Au-delà, les journées programmées ne sont pas proposées."
          />
        </div>

        <CalendrierDisponibilites
          dates={dates}
          onChange={setDates}
          dureeMin={duree}
          fuseau="GMT+01:00 Africa/Casablanca"
        />

        <Textarea
          label="Message affiché aux candidats"
          rows={3}
          maxLength={500}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Présentez le format de l'échange, ce que vous attendez d'un premier contact…"
          hint={`${message.length}/500 caractères`}
        />

        {enregistrer.error && <ErrorBanner error={enregistrer.error} />}
        {/* Le succès ne vaut que pour l'état enregistré : dès la retouche
            suivante, « Disponibilités enregistrées » deviendrait un mensonge. */}
        {enregistre && !modifie && !enregistrer.error && (
          <SuccessBanner message="Disponibilités enregistrées." />
        )}

        {/*
          Barre d'action collante : le calendrier et le récapitulatif des
          journées font plusieurs écrans de haut. Un bouton « Enregistrer » en
          pied de carte se retrouvait hors de vue au moment précis où l'on
          venait de programmer une date.
        */}
        <div
          className={cn(
            // `-mx-6 px-6` : la barre s'étend d'un bord à l'autre de la carte,
            // dont `CardBody` retranche 24px de chaque côté.
            "sticky bottom-0 -mx-6 flex flex-wrap items-center gap-3 border-t px-6 py-3",
            modifie
              ? "border-secondary bg-secondary-container"
              : "border-transparent bg-surface-container-lowest",
          )}
        >
          <p className="min-w-0 flex-1 text-xs">
            {modifie ? (
              <span className="flex items-center gap-1.5 font-semibold text-on-secondary-container">
                <Icon name="warning" className="text-[15px]" />
                Modifications non enregistrées — vos créneaux n&apos;ont pas encore changé.
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-on-surface-variant">
                <Icon name={ouverte ? "check_circle" : "visibility_off"} className="text-[15px]" />
                {ouverte
                  ? "Vos créneaux sont visibles par les candidats validés."
                  : "Vos créneaux ne sont visibles par personne."}
              </span>
            )}
          </p>

          {modifie && (
            <Button
              variant="ghost"
              size="sm"
              disabled={enregistrer.pending}
              onClick={() => data && reprendre(data)}
            >
              Annuler
            </Button>
          )}

          <Button
            variant="secondary"
            onClick={() => void soumettre()}
            disabled={fautives > 0 || enregistrer.pending || !modifie}
          >
            {enregistrer.pending ? "Enregistrement…" : "Enregistrer"}
          </Button>

          {fautives > 0 && (
            <span className="w-full text-xs font-semibold text-error">
              Corrigez {fautives} journée{fautives > 1 ? "s" : ""} avant d&apos;enregistrer.
            </span>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
