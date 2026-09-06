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
 */
import { useEffect, useMemo, useState } from "react";
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
import type { ApiDateProgrammee } from "@/lib/api/types";
import { useApi, useMutation } from "@/lib/api/use-api";

const DUREES = [15, 30, 45, 60, 90, 120];
const HORIZONS = [1, 2, 4, 6, 8, 12];

export function DisponibilitesEditor() {
  const { data, loading, error, refetch } = useApi(() => api.disponibilites.get(), []);
  const enregistrer = useMutation(api.disponibilites.update);

  const [ouverte, setOuverte] = useState(false);
  const [duree, setDuree] = useState(30);
  const [semaines, setSemaines] = useState(4);
  const [message, setMessage] = useState("");
  const [dates, setDates] = useState<ApiDateProgrammee[]>([]);
  const [enregistre, setEnregistre] = useState(false);

  useEffect(() => {
    if (!data) return;
    setOuverte(data.spontaneeOuverte);
    setDuree(data.creneauDureeMin);
    setSemaines(data.reservationSemaines);
    setMessage(data.spontaneeMessage);
    setDates(data.dates ?? []);
  }, [data]);

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
        {enregistre && !enregistrer.error && (
          <SuccessBanner message="Disponibilités enregistrées." />
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => void soumettre()}
            disabled={fautives > 0 || enregistrer.pending}
          >
            {enregistrer.pending ? "Enregistrement…" : "Enregistrer"}
          </Button>
          {fautives > 0 && (
            <span className="text-xs text-error">
              Corrigez {fautives} journée{fautives > 1 ? "s" : ""} avant d&apos;enregistrer.
            </span>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
