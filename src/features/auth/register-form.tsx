"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Button,
  Card,
  CardBody,
  ErrorBanner,
  Icon,
  type IconName,
  Input,
  optionsFromLabels,
  ProgressBar,
  Select,
} from "@/components/ui";
import { api } from "@/lib/api";
import { useMutation } from "@/lib/api/use-api";
import { NIVEAUX_ETUDES, type Role } from "@/lib/constants";
import { useFilieres } from "@/features/admin/use-referentiel";
import { cn } from "@/lib/utils";
import { PasswordField, isPasswordValid } from "./password-field";

type RegisterRole = Extract<Role, "jeune" | "entreprise">;

const EMPTY_JEUNE = {
  prenom: "",
  nom: "",
  email: "",
  telephone: "",
  ville: "",
  filiereId: "",
  niveauEtudes: "",
  etablissement: "",
};

const ROLES: { value: RegisterRole; label: string; desc: string; icon: IconName }[] = [
  {
    value: "jeune",
    label: "Jeune talent",
    desc: "Candidater, se former, passer le test de validation.",
    icon: "school",
  },
  {
    value: "entreprise",
    label: "Entreprise",
    desc: "Publier des offres et rechercher des profils.",
    icon: "business",
  },
];

/** Ce que le compte apporte, dit avant le formulaire et non après. */
const REASSURANCE = [
  "Inscription gratuite, sans engagement.",
  "Profil vérifié par l'équipe OMB.",
  "Offres et formations ciblées sur votre filière.",
];

const EMPTY_ENTREPRISE = {
  responsable: "",
  telephone: "",
  email: "",
  nom: "",
  ville: "",
  secteur: "",
};

/** Registration form with a jeune / entreprise toggle (§5.1 & §6.1). */
export function RegisterForm() {
  /*
   * Les filières viennent du référentiel, donc d'un appel réseau. Son état est
   * repris jusque dans le champ : une liste vide sans explication laissait le
   * candidat bloqué, sans même savoir qu'un chargement avait échoué.
   */
  const {
    filieres,
    loading: filieresLoading,
    error: filieresError,
    refetch: rechargerFilieres,
  } = useFilieres();
  const searchParams = useSearchParams();
  const initial = (searchParams.get("role") as RegisterRole) ?? "jeune";
  const [role, setRole] = useState<RegisterRole>(initial === "entreprise" ? "entreprise" : "jeune");

  const [jeune, setJeune] = useState(EMPTY_JEUNE);
  const [entreprise, setEntreprise] = useState(EMPTY_ENTREPRISE);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [cguAcceptees, setCguAcceptees] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);

  const { run, pending, error } = useMutation(async (): Promise<string> => {
    if (role === "jeune") {
      await api.auth.registerJeune({
        email: jeune.email,
        password,
        prenom: jeune.prenom,
        nom: jeune.nom,
        // Tous exigés par l'API : plus de diffusion conditionnelle, un champ
        // vide doit remonter une erreur de validation, pas être escamoté.
        telephone: jeune.telephone,
        ville: jeune.ville,
        filiereId: jeune.filiereId,
        niveauEtudes: jeune.niveauEtudes,
        etablissement: jeune.etablissement,
      });
      return jeune.email;
    }

    await api.auth.registerEntreprise({
      email: entreprise.email,
      password,
      nom: entreprise.nom,
      secteur: entreprise.secteur,
      ville: entreprise.ville,
      responsable: entreprise.responsable,
      telephone: entreprise.telephone,
    });
    return entreprise.email;
  });

  /*
   * Filière absente du référentiel : le candidat la saisit, elle est créée et
   * aussitôt rattachée. Le serveur rapproche les noms équivalents — casse,
   * accents et espaces ignorés — donc réécrire une filière existante ne crée
   * pas de doublon, elle est simplement sélectionnée.
   */
  const proposerFiliere = useMutation(api.referentiels.proposerFiliere);
  const [filiereAjoutee, setFiliereAjoutee] = useState<string | null>(null);

  const ajouterFiliere = async (nom: string) => {
    const entree = await proposerFiliere.run(nom);
    if (!entree) return;

    setJeune((actuel) => ({ ...actuel, filiereId: entree.id }));
    setFiliereAjoutee(entree.nom);
    rechargerFilieres();
  };

  /*
   * Contrôle de l'email à la sortie du champ, et non à l'envoi.
   *
   * L'inscription n'ouvre pas de session : elle envoie un lien de vérification.
   * Une adresse mal saisie ne se voit donc jamais — le candidat attend un
   * courriel qui n'arrivera pas. Autant le dire pendant qu'il est encore devant
   * le champ. Le serveur revalide, ce contrôle ne fait que devancer le sien.
   */
  const [emailTouche, setEmailTouche] = useState(false);
  const emailSaisi = role === "jeune" ? jeune.email : entreprise.email;
  const emailMalForme =
    emailTouche && emailSaisi.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailSaisi);

  const passwordsMatch = confirm.length === 0 || password === confirm;

  /*
   * Les CGU sont suivies en état, pas laissées au `required` de la case : le
   * formulaire est en `noValidate` — pour afficher NOS messages plutôt que ceux
   * du navigateur — ce qui neutralisait complètement cette obligation.
   */
  const canSubmit = isPasswordValid(password) && password === confirm && cguAcceptees;

  /**
   * Pourquoi le bouton reste inactif.
   *
   * Un bouton désactivé sans explication est une impasse : l'utilisateur ne
   * voit pas ce qui manque, surtout quand la cause est un champ plus haut.
   */
  const blocage = !isPasswordValid(password)
    ? "Choisissez un mot de passe respectant les critères ci-dessus."
    : password !== confirm
      ? "Les deux mots de passe doivent être identiques."
      : !cguAcceptees
        ? "Acceptez les conditions générales pour continuer."
        : null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    const email = await run();
    if (email) setSubmitted(email);
  };

  /*
   * Avancement du formulaire.
   *
   * Onze champs obligatoires s'annoncent mal : la page ne montre jamais combien
   * il en reste, et c'est en plein milieu qu'on abandonne. Le décompte est
   * calculé sur les champs RÉELLEMENT exigés par l'API pour le rôle courant.
   */
  const champsObligatoires =
    role === "jeune"
      ? [
          jeune.prenom,
          jeune.nom,
          jeune.email,
          jeune.telephone,
          jeune.ville,
          jeune.filiereId,
          jeune.niveauEtudes,
          jeune.etablissement,
        ]
      : [
          entreprise.responsable,
          entreprise.telephone,
          entreprise.email,
          entreprise.nom,
          entreprise.ville,
          entreprise.secteur,
        ];

  // Les deux mots de passe comptent pour un seul « champ » : ils se remplissent
  // d'un même geste et les séparer donnerait un compteur qui stagne.
  const total = champsObligatoires.length + 1;
  const remplis =
    champsObligatoires.filter((valeur) => valeur.trim() !== "").length +
    (isPasswordValid(password) && password === confirm ? 1 : 0);
  const restants = total - remplis;

  /*
   * Renvoi du focus sur le premier champ refusé par le serveur.
   *
   * Le bandeau d'erreur est en haut, le champ fautif peut être trois écrans
   * plus bas : sans ce recalage, l'échec est annoncé mais introuvable. On vise
   * `aria-invalid`, que `Input` et `Select` posent déjà.
   */
  const formRef = useRef<HTMLFormElement>(null);
  const bandeauRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!error) return;
    const cible =
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]') ?? bandeauRef.current;
    cible?.focus({ preventScroll: true });
    cible?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [error]);

  /* Navigation au clavier du choix de rôle — exigée par `role="radiogroup"`. */
  const roleRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const onRoleKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(event.key)) return;
    event.preventDefault();
    const avant = event.key === "ArrowRight" || event.key === "ArrowDown";
    const suivant = (index + (avant ? 1 : -1) + ROLES.length) % ROLES.length;
    setRole(ROLES[suivant]!.value);
    roleRefs.current[suivant]?.focus();
  };

  const blocageId = `${useId()}-blocage`;

  // Le backend ne connecte PAS après inscription : il envoie un email de
  // vérification. On affiche donc un écran d'attente plutôt qu'une redirection.
  if (submitted) {
    return <RegistrationPending email={submitted} isEntreprise={role === "entreprise"} />;
  }

  return (
    <div>
      <h1 className="font-headline text-3xl font-bold text-primary">Créer un compte</h1>
      {/*
        Le sous-titre annonçait « quatre champs suffisent » alors que l'API en
        exige huit pour un jeune : la promesse se démentait au premier écran
        déroulé. Mieux vaut annoncer la durée réelle que sous-estimer l'effort.
      */}
      <p className="mt-2 text-on-surface-variant">
        Gratuit et sans engagement. Comptez deux minutes.
      </p>

      {/*
        Réassurance réservée au mobile : le panneau de marque est en `lg:flex`,
        donc invisible en dessous — et c'est là que se trouve l'essentiel du
        public. Sans lui, il ne reste qu'un logo et une liste de champs, sans
        rien qui dise à quoi sert le compte ni ce qu'il engage.
      */}
      <ul className="mt-5 grid gap-2 text-sm text-on-surface-variant lg:hidden">
        {REASSURANCE.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <Icon name="check_circle" className="mt-0.5 shrink-0 text-[16px] text-success" />
            {item}
          </li>
        ))}
      </ul>

      {/*
        Deux cartes explicites plutôt qu'un interrupteur à deux mots : le type
        de compte détermine tout le parcours et n'est pas modifiable ensuite.
        Se tromper coûte une réinscription, autant dire ce que chacun ouvre.
      */}
      <div role="radiogroup" aria-label="Type de compte" className="mt-6 grid gap-3 sm:grid-cols-2">
        {ROLES.map((option, index) => {
          const actif = role === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={actif}
              // `radiogroup` impose les flèches et un seul arrêt de tabulation :
              // sans cela, le clavier traverse deux boutons sans jamais changer
              // la sélection, alors que la souris, elle, la change au clic.
              ref={(node) => {
                roleRefs.current[index] = node;
              }}
              tabIndex={actif ? 0 : -1}
              onKeyDown={(event) => onRoleKeyDown(event, index)}
              onClick={() => setRole(option.value)}
              className={cn(
                "flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
                // Anneau au clavier : sans lui, la navigation au tabulateur
                // traverse ce choix sans qu'on voie jamais où l'on se trouve.
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary",
                actif
                  ? "border-primary bg-primary-container/40 ring-1 ring-primary"
                  : "border-outline-variant hover:bg-surface-container-low",
              )}
            >
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                  actif
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container text-on-surface-variant",
                )}
              >
                <Icon name={option.icon} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-on-surface">{option.label}</span>
                <span className="block text-xs text-on-surface-variant">{option.desc}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/*
        Avancement : `aria-live="polite"` pour que le décompte soit ENTENDU au
        fil de la saisie, pas seulement vu — c'est la seule indication de ce
        qu'il reste à faire sur un formulaire de cette longueur.
      */}
      <div className="mt-6 space-y-1.5">
        <div className="flex items-baseline justify-between text-xs">
          <span className="font-semibold uppercase tracking-wide text-on-surface-variant">
            Progression
          </span>
          <span aria-live="polite" className="text-on-surface-variant">
            {restants === 0
              ? "Tout est rempli"
              : `${remplis}/${total} · ${restants} champ${restants > 1 ? "s" : ""} restant${restants > 1 ? "s" : ""}`}
          </span>
        </div>
        <ProgressBar value={(remplis / total) * 100} className="h-1.5" />
      </div>

      <form ref={formRef} className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
        {error && (
          // `tabIndex={-1}` : cible de repli du recalage de focus quand l'erreur
          // ne porte sur aucun champ précis (conflit, limite de débit…).
          <div ref={bandeauRef} tabIndex={-1} className="focus-visible:outline-none">
            <ErrorBanner error={error} />
          </div>
        )}

        {role === "jeune" ? (
          <>
            <Section titre="Votre identité" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Prénom"
                autoComplete="given-name"
                placeholder="Lucas"
                value={jeune.prenom}
                onChange={(e) => setJeune({ ...jeune, prenom: e.target.value })}
                error={error?.issueFor("prenom")}
                required
              />
              <Input
                label="Nom"
                autoComplete="family-name"
                placeholder="Dupont"
                value={jeune.nom}
                onChange={(e) => setJeune({ ...jeune, nom: e.target.value })}
                error={error?.issueFor("nom")}
                required
              />
            </div>
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="vous@email.com"
              value={jeune.email}
              onChange={(e) => {
                setJeune({ ...jeune, email: e.target.value });
                setEmailTouche(false);
              }}
              onBlur={() => setEmailTouche(true)}
              error={
                error?.issueFor("email") ??
                (emailMalForme ? "Cette adresse ne semble pas valide." : undefined)
              }
              required
            />
            <Section
              titre="Vos études"
              aide="Ces informations déterminent le test de validation qui vous sera proposé et le ciblage des offres."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Téléphone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                placeholder="+212 6 …"
                value={jeune.telephone}
                onChange={(e) => setJeune({ ...jeune, telephone: e.target.value })}
                error={error?.issueFor("telephone")}
                required
              />
              <Input
                label="Ville"
                autoComplete="address-level2"
                placeholder="Casablanca"
                value={jeune.ville}
                onChange={(e) => setJeune({ ...jeune, ville: e.target.value })}
                error={error?.issueFor("ville")}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* La valeur est l'identifiant, le libellé n'est qu'un affichage. */}
              <div>
                <Select
                  label="Filière"
                  icon="school"
                  value={jeune.filiereId}
                  onChange={(filiereId) => {
                    setJeune({ ...jeune, filiereId });
                    // La confirmation d'ajout ne vaut plus dès qu'on change.
                    setFiliereAjoutee(null);
                  }}
                  error={error?.issueFor("filiereId") ?? proposerFiliere.error?.message}
                  options={filieres.map((f) => ({ value: f.id, label: f.nom }))}
                  loading={filieresLoading || proposerFiliere.pending}
                  emptyMessage="Aucune filière disponible"
                  required
                  // Le candidat n'est pas bloqué si la sienne manque : il la
                  // saisit, elle est créée et rattachée dans la foulée.
                  onCreate={(nom) => void ajouterFiliere(nom)}
                  createLabel={(saisie) => `Ajouter la filière « ${saisie} »`}
                  hint="Absente de la liste ? Saisissez-la, elle sera ajoutée."
                />
                {filiereAjoutee && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-success">
                    <Icon name="check_circle" className="text-[14px]" />
                    Filière « {filiereAjoutee} » ajoutée et sélectionnée.
                  </p>
                )}
                {filieresError && (
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-error">
                    <span>Liste des filières indisponible.</span>
                    <button
                      type="button"
                      onClick={rechargerFilieres}
                      // Cible tactile portée à 44 px de haut : un lien de
                      // récupération inatteignable au doigt ne récupère rien.
                      className="inline-flex min-h-[44px] items-center px-2 font-semibold underline hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
                    >
                      Réessayer
                    </button>
                  </p>
                )}
              </div>
              <Select
                label="Niveau d'études"
                icon="workspace_premium"
                value={jeune.niveauEtudes}
                onChange={(niveauEtudes) => setJeune({ ...jeune, niveauEtudes })}
                error={error?.issueFor("niveauEtudes")}
                required
                options={optionsFromLabels(NIVEAUX_ETUDES)}
              />
            </div>
            <Input
              label="Établissement"
              autoComplete="organization"
              placeholder="ENSIAS"
              value={jeune.etablissement}
              onChange={(e) => setJeune({ ...jeune, etablissement: e.target.value })}
              error={error?.issueFor("etablissement")}
              required
            />
          </>
        ) : (
          <>
            <Section titre="Votre contact" />
            <Input
              label="Nom du responsable"
              autoComplete="name"
              placeholder="Sophie Martin"
              value={entreprise.responsable}
              onChange={(e) => setEntreprise({ ...entreprise, responsable: e.target.value })}
              error={error?.issueFor("responsable")}
              required
            />
            <Input
              label="Téléphone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              placeholder="+212 5 …"
              value={entreprise.telephone}
              onChange={(e) => setEntreprise({ ...entreprise, telephone: e.target.value })}
              error={error?.issueFor("telephone")}
              required
            />
            <Input
              label="Email professionnel"
              type="email"
              autoComplete="email"
              placeholder="rh@entreprise.ma"
              value={entreprise.email}
              onChange={(e) => {
                setEntreprise({ ...entreprise, email: e.target.value });
                setEmailTouche(false);
              }}
              onBlur={() => setEmailTouche(true)}
              error={
                error?.issueFor("email") ??
                (emailMalForme ? "Cette adresse ne semble pas valide." : undefined)
              }
              required
            />
            <Section titre="Votre entreprise" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Nom de l'entreprise"
                autoComplete="organization"
                placeholder="TechSolutions"
                value={entreprise.nom}
                onChange={(e) => setEntreprise({ ...entreprise, nom: e.target.value })}
                error={error?.issueFor("nom")}
                required
              />
              <Input
                label="Ville"
                autoComplete="address-level2"
                placeholder="Casablanca"
                value={entreprise.ville}
                onChange={(e) => setEntreprise({ ...entreprise, ville: e.target.value })}
                error={error?.issueFor("ville")}
                required
              />
            </div>
            <Input
              label="Secteur d'activité"
              placeholder="Édition de logiciels"
              value={entreprise.secteur}
              onChange={(e) => setEntreprise({ ...entreprise, secteur: e.target.value })}
              error={error?.issueFor("secteur")}
              required
            />
          </>
        )}

        <Section titre="Votre mot de passe" />
        <div className="grid gap-4 sm:grid-cols-2">
          <PasswordField
            value={password}
            onChange={setPassword}
            error={error?.issueFor("password")}
          />
          {/*
            Même champ que ci-dessus, règles masquées : la confirmation est
            justement l'endroit où une faute de frappe coûte le plus cher, et
            elle était le seul mot de passe qu'on ne pouvait pas relire.
          */}
          <PasswordField
            label="Confirmer"
            value={confirm}
            onChange={setConfirm}
            showRules={false}
            error={passwordsMatch ? undefined : "Les mots de passe ne correspondent pas."}
          />
        </div>

        {role === "entreprise" && (
          <p className="rounded-lg bg-surface-container px-4 py-3 text-xs text-on-surface-variant">
            <strong>Note :</strong> les comptes entreprise sont validés manuellement par
            l&apos;équipe OMB avant activation.
          </p>
        )}

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-outline-variant px-4 py-3 text-sm text-on-surface-variant transition-colors hover:bg-surface-container-low">
          <input
            type="checkbox"
            checked={cguAcceptees}
            onChange={(e) => setCguAcceptees(e.target.checked)}
            className="mt-0.5 rounded border-outline-variant text-secondary focus:ring-secondary"
          />
          <span>
            J&apos;accepte les conditions générales d&apos;utilisation et la politique de
            confidentialité.
          </span>
        </label>

        <div className="space-y-2">
          <Button
            type="submit"
            size="lg"
            fullWidth
            disabled={pending || !canSubmit}
            // Le motif du blocage était affiché SOUS le bouton sans y être
            // rattaché : à la synthèse vocale, le bouton s'annonçait désactivé
            // sans jamais dire pourquoi.
            aria-describedby={blocage ? blocageId : undefined}
          >
            {pending ? "Création…" : "Créer mon compte"}
          </Button>
          {blocage && (
            <p id={blocageId} className="text-center text-xs text-on-surface-variant">
              {blocage}
            </p>
          )}
        </div>
      </form>

      <p className="mt-6 text-center text-sm text-on-surface-variant">
        Déjà inscrit ?{" "}
        <Link
          href="/connexion"
          className="inline-flex min-h-[44px] items-center px-2 font-semibold text-primary hover:underline"
        >
          Se connecter
        </Link>
      </p>
    </div>
  );
}

/**
 * Intertitre du formulaire.
 *
 * Huit champs d'affilée se lisent comme une corvée ; regroupés et annoncés,
 * ils se parcourent. `aide` dit ce qui est facultatif — c'est ce qui raccourcit
 * le plus la longueur perçue.
 */
function Section({ titre, aide }: { titre: string; aide?: string }) {
  return (
    <div className="pt-2 first:pt-0">
      <h2 className="text-sm font-bold uppercase tracking-wide text-on-surface-variant">{titre}</h2>
      {aide && <p className="mt-0.5 text-xs text-on-surface-variant">{aide}</p>}
    </div>
  );
}

/** Écran affiché après inscription : l'email doit être confirmé. */
function RegistrationPending({ email, isEntreprise }: { email: string; isEntreprise: boolean }) {
  const { run, pending, error } = useMutation(() => api.auth.resendVerification(email));
  const [resent, setResent] = useState(false);

  return (
    <Card>
      <CardBody className="flex flex-col items-center gap-4 py-8 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
          <Icon name="mail" className="text-2xl" />
        </span>
        <div>
          <h1 className="font-headline text-2xl font-bold text-primary">Vérifiez vos emails</h1>
          <p className="mt-2 text-sm text-on-surface-variant">
            Un lien de confirmation a été envoyé à <strong>{email}</strong>. Il est valable 30
            minutes.
          </p>
        </div>

        {isEntreprise && (
          <p className="rounded-lg bg-surface-container px-4 py-3 text-xs text-on-surface-variant">
            Une fois votre adresse confirmée, l&apos;équipe OMB prendra contact avec vous pour
            valider le compte avant que vous puissiez publier des offres.
          </p>
        )}

        {error && <ErrorBanner error={error} className="w-full" />}
        {resent && !error && (
          <p className="text-sm text-success">Un nouvel email vient d&apos;être envoyé.</p>
        )}

        <div className="flex flex-wrap justify-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => {
              void run().then((result) => setResent(result !== null));
            }}
          >
            <Icon name="replay" className="text-[18px]" />
            {pending ? "Envoi…" : "Renvoyer l'email"}
          </Button>
          <Link
            href="/connexion"
            className="inline-flex items-center rounded-full px-4 py-1.5 text-sm font-semibold text-primary hover:bg-surface-container"
          >
            Aller à la connexion
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}
