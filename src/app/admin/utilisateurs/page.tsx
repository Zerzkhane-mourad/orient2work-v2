"use client";

/**
 * Comptes d'administration.
 *
 * N'y figurent QUE les administrateurs : les jeunes et les entreprises ont
 * leurs propres écrans, et s'inscrivent eux-mêmes par le parcours public.
 *
 * Deux refus viennent du serveur et sont anticipés ici, boutons désactivés à
 * l'appui, pour qu'on ne les découvre pas après coup :
 *  • on n'agit pas sur son propre compte — se retirer son rôle est l'erreur
 *    qu'on ne peut pas réparer soi-même ;
 *  • le dernier super administrateur actif ne se désactive pas.
 */
import { Suspense, useState } from "react";
import {
  Badge,
  Button,
  ErrorBanner,
  ErrorState,
  Icon,
  Input,
  Modal,
  PageHeader,
  Select,
  SkeletonList,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@/components/ui";
import {
  AdminFilters,
  Pagination,
  StatusFilter,
  TableEmpty,
  TableSkeleton,
} from "@/features/admin/admin-table";
import { useSession } from "@/features/auth/session-provider";
import { usePermissions } from "@/features/auth/use-permissions";
import { api } from "@/lib/api";
import type { ApiUtilisateurAdmin } from "@/lib/api/types";
import { useApi, useMutation } from "@/lib/api/use-api";
import { useDebounced } from "@/lib/use-debounced";
import { useFiltresUrl } from "@/lib/use-filtres-url";
import { useClampPage, usePageSize, usePagination } from "@/lib/use-pagination";

const PER_PAGE = 20;
const COLUMNS = 6;

/** Constante de module : `useFiltresUrl` la garde comme état de référence. */
const FILTRES = { q: "", role: "", actif: "" };

const ETAT_OPTIONS = [
  { value: "true", label: "Actifs" },
  { value: "false", label: "Désactivés" },
] as const;

interface BrouillonCreation {
  nom: string;
  email: string;
  password: string;
  roleAdminId: string;
}

const VIDE: BrouillonCreation = { nom: "", email: "", password: "", roleAdminId: "" };

/** Date lisible, ou le repère explicite d'un compte qui ne s'est jamais connecté. */
function derniereConnexion(iso: string | null): string {
  if (!iso) return "Jamais";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function AdminUtilisateursPage() {
  return (
    <Suspense fallback={<SkeletonList count={4} />}>
      <Contenu />
    </Suspense>
  );
}

function Contenu() {
  const { user } = useSession();
  const { can } = usePermissions();
  const peutEcrire = can("utilisateurs:write");

  const { valeurs, definir, reinitialiser, actifs } = useFiltresUrl(FILTRES);
  const debounced = useDebounced(valeurs.q.trim());

  const { perPage, setPerPage } = usePageSize({
    defaultSize: PER_PAGE,
    storageKey: "admin-utilisateurs",
  });
  const { page, goTo, listRef, clampTo } = usePagination({
    perPage,
    resetOn: [debounced, valeurs.role, valeurs.actif],
  });

  const { data, loading, error, refetch } = useApi(
    () =>
      api.admin.utilisateurs({
        q: debounced || undefined,
        roleAdminId: valeurs.role || undefined,
        // Filtre absent = actifs et désactivés confondus, d'où le passage par
        // `undefined` plutôt qu'un booléen par défaut.
        actif: valeurs.actif === "" ? undefined : valeurs.actif === "true",
        page,
        perPage,
      }),
    [debounced, valeurs.role, valeurs.actif, page, perPage],
  );

  useClampPage(data?.meta, clampTo);

  /*
   * Les rôles servent au filtre ET au formulaire : chargés une fois, hors
   * pagination. `perPage` large parce qu'un back-office compte une poignée de
   * rôles et que la liste alimente un `<select>`, qui n'a pas de pages.
   */
  const roles = useApi(() => api.admin.roles({ perPage: 100 }), []);
  const optionsRoles = (roles.data?.items ?? []).map((role) => ({
    value: role.id,
    label: role.nom,
  }));

  const [creating, setCreating] = useState(false);
  const [brouillon, setBrouillon] = useState<BrouillonCreation>(VIDE);
  /** Compte dont on réinitialise le mot de passe. */
  const [resetting, setResetting] = useState<ApiUtilisateurAdmin | null>(null);
  const [motDePasse, setMotDePasse] = useState("");
  const [deleting, setDeleting] = useState<ApiUtilisateurAdmin | null>(null);

  const create = useMutation(api.admin.createUtilisateur);
  const update = useMutation(api.admin.updateUtilisateur);
  const reset = useMutation(api.admin.resetUtilisateurPassword);
  const remove = useMutation(api.admin.deleteUtilisateur);

  const pending = create.pending || update.pending || reset.pending || remove.pending;
  const erreurListe = update.error ?? (deleting ? null : remove.error);

  const fermer = () => {
    setCreating(false);
    setResetting(null);
    setDeleting(null);
    setMotDePasse("");
    create.reset();
    reset.reset();
    remove.reset();
  };

  const soumettreCreation = async (event: React.FormEvent) => {
    event.preventDefault();
    const cree = await create.run({
      nom: brouillon.nom.trim(),
      email: brouillon.email.trim(),
      password: brouillon.password,
      roleAdminId: brouillon.roleAdminId,
    });
    if (cree) {
      fermer();
      refetch();
    }
  };

  const changerRole = async (id: string, roleAdminId: string) => {
    if (!roleAdminId) return;
    const modifie = await update.run(id, { roleAdminId });
    if (modifie) refetch();
  };

  const basculerActivation = async (compte: ApiUtilisateurAdmin) => {
    const modifie = await update.run(compte.id, { actif: !compte.actif });
    if (modifie) refetch();
  };

  const utilisateurs = data?.items ?? [];
  const creationValide =
    brouillon.nom.trim().length >= 2 &&
    brouillon.email.trim().length > 0 &&
    brouillon.password.length >= 12 &&
    brouillon.roleAdminId !== "";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Comptes d'administration"
        subtitle="Créez les accès au back-office et attribuez à chacun son rôle."
        actions={
          peutEcrire && (
            <Button
              variant="secondary"
              disabled={optionsRoles.length === 0}
              title={
                optionsRoles.length === 0
                  ? "Créez d'abord un rôle : un compte sans rôle n'a accès à rien."
                  : undefined
              }
              onClick={() => {
                setBrouillon(VIDE);
                create.reset();
                setCreating(true);
              }}
            >
              <Icon name="person_add" className="text-[18px]" /> Nouvel utilisateur
            </Button>
          )
        }
      />

      <AdminFilters
        query={valeurs.q}
        onQueryChange={(valeur) => definir("q", valeur)}
        placeholder="Nom ou adresse email…"
        onReset={actifs ? reinitialiser : undefined}
      >
        <StatusFilter
          value={valeurs.role}
          onChange={(valeur) => definir("role", valeur)}
          options={optionsRoles}
          allLabel="Tous les rôles"
        />
        <StatusFilter
          value={valeurs.actif}
          onChange={(valeur) => definir("actif", valeur)}
          options={ETAT_OPTIONS}
          allLabel="Tous les états"
        />
      </AdminFilters>

      {roles.error && <ErrorBanner error={roles.error} />}
      {erreurListe && <ErrorBanner error={erreurListe} />}

      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <div ref={listRef} className="space-y-4">
          <Table>
            <THead>
              <TR>
                <TH>Utilisateur</TH>
                <TH>Rôle</TH>
                <TH>État</TH>
                <TH>Dernière connexion</TH>
                <TH>Créé le</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>

            {loading ? (
              <TableSkeleton columns={COLUMNS} />
            ) : utilisateurs.length === 0 ? (
              <TableEmpty
                columns={COLUMNS}
                icon="badge"
                message="Aucun compte ne correspond"
                hint="Élargissez la recherche, ou créez un premier administrateur."
              />
            ) : (
              <TBody>
                {utilisateurs.map((compte) => {
                  // Le serveur refuse toute action sur son propre compte ; le
                  // dire AVANT le clic évite un message d'erreur inutile.
                  const soi = compte.id === user?.id;
                  const verrouille = pending || soi || !peutEcrire;

                  return (
                    <TR key={compte.id}>
                      <TD>
                        <p className="font-semibold text-primary">
                          {compte.nom || "—"}
                          {soi && (
                            <span className="ml-2 text-xs font-normal text-on-surface-variant">
                              (vous)
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-on-surface-variant">{compte.email}</p>
                      </TD>
                      <TD>
                        {/* Le rôle se change SUR PLACE : c'est l'action
                            quotidienne de cet écran, elle ne mérite pas une
                            modale. Les autres, plus rares ou destructrices,
                            en demandent une. */}
                        <Select
                          size="sm"
                          className="min-w-44"
                          aria-label={`Rôle de ${compte.nom || compte.email}`}
                          value={compte.role?.id ?? ""}
                          disabled={verrouille || optionsRoles.length === 0}
                          onChange={(valeur) => void changerRole(compte.id, valeur)}
                          options={
                            compte.role
                              ? optionsRoles
                              : // Un compte sans rôle doit afficher son absence,
                                // sans quoi le `<select>` montrerait le premier
                                // rôle de la liste comme s'il l'avait.
                                [{ value: "", label: "Aucun rôle" }, ...optionsRoles]
                          }
                        />
                      </TD>
                      <TD>
                        {compte.actif ? (
                          <Badge tone="success" icon="check_circle">
                            Actif
                          </Badge>
                        ) : (
                          <Badge tone="error" icon="block">
                            Désactivé
                          </Badge>
                        )}
                      </TD>
                      <TD className="text-on-surface-variant">
                        {derniereConnexion(compte.lastLoginAt)}
                      </TD>
                      <TD className="text-on-surface-variant">
                        {derniereConnexion(compte.createdAt)}
                      </TD>
                      <TD>
                        <div className="flex justify-end gap-1">
                          {peutEcrire && (
                            <>
                              <button
                                type="button"
                                disabled={verrouille}
                                onClick={() => {
                                  setMotDePasse("");
                                  reset.reset();
                                  setResetting(compte);
                                }}
                                className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container disabled:opacity-30"
                                aria-label={`Réinitialiser le mot de passe de ${compte.nom || compte.email}`}
                                title={
                                  soi
                                    ? "Changez votre propre mot de passe depuis vos paramètres"
                                    : "Réinitialiser le mot de passe"
                                }
                              >
                                <Icon name="lock" className="text-[18px]" />
                              </button>
                              <button
                                type="button"
                                disabled={verrouille}
                                onClick={() => void basculerActivation(compte)}
                                className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container disabled:opacity-30"
                                aria-label={
                                  compte.actif
                                    ? `Désactiver ${compte.nom || compte.email}`
                                    : `Réactiver ${compte.nom || compte.email}`
                                }
                                title={compte.actif ? "Désactiver" : "Réactiver"}
                              >
                                <Icon
                                  name={compte.actif ? "visibility_off" : "visibility"}
                                  className="text-[18px]"
                                />
                              </button>
                              <button
                                type="button"
                                disabled={verrouille}
                                onClick={() => {
                                  remove.reset();
                                  setDeleting(compte);
                                }}
                                className="rounded-full p-2 text-error hover:bg-error-container disabled:opacity-30"
                                aria-label={`Supprimer ${compte.nom || compte.email}`}
                                title={
                                  soi ? "Vous ne pouvez pas supprimer votre compte" : "Supprimer"
                                }
                              >
                                <Icon name="delete" className="text-[18px]" />
                              </button>
                            </>
                          )}
                        </div>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            )}
          </Table>

          {data?.meta && (
            <Pagination
              meta={data.meta}
              onPageChange={goTo}
              onPerPageChange={setPerPage}
              busy={loading}
              unit="compte"
            />
          )}
        </div>
      )}

      {/* Création */}
      <Modal
        open={creating}
        onClose={fermer}
        title="Nouvel utilisateur"
        description="Le compte est actif immédiatement, son adresse est considérée comme vérifiée."
        footer={
          <>
            <Button variant="ghost" onClick={fermer}>
              Annuler
            </Button>
            <Button
              variant="secondary"
              form="utilisateur-create"
              type="submit"
              disabled={pending || !creationValide}
            >
              {create.pending ? "Création…" : "Créer le compte"}
            </Button>
          </>
        }
      >
        <form id="utilisateur-create" onSubmit={soumettreCreation} className="space-y-4" noValidate>
          {create.error && <ErrorBanner error={create.error} />}
          <Input
            label="Nom et prénom"
            placeholder="Karim Bennani"
            value={brouillon.nom}
            onChange={(e) => setBrouillon({ ...brouillon, nom: e.target.value })}
            error={create.error?.issueFor("nom")}
            required
          />
          <Input
            label="Adresse email"
            type="email"
            autoComplete="off"
            placeholder="karim.bennani@omb.ma"
            value={brouillon.email}
            onChange={(e) => setBrouillon({ ...brouillon, email: e.target.value })}
            error={create.error?.issueFor("email")}
            hint="Elle servira d'identifiant de connexion."
            required
          />
          <Input
            label="Mot de passe"
            type="password"
            /* `new-password` : sans cela, le gestionnaire du navigateur
               proposerait les identifiants de l'administrateur connecté. */
            autoComplete="new-password"
            value={brouillon.password}
            onChange={(e) => setBrouillon({ ...brouillon, password: e.target.value })}
            error={create.error?.issueFor("password")}
            hint="12 caractères minimum, avec majuscule, minuscule et chiffre. Communiquez-le par un canal sûr et demandez-lui de le changer."
            required
          />
          <Select
            label="Rôle"
            value={brouillon.roleAdminId}
            onChange={(valeur) => setBrouillon({ ...brouillon, roleAdminId: valeur })}
            options={[{ value: "", label: "Choisir un rôle…" }, ...optionsRoles]}
            error={create.error?.issueFor("roleAdminId")}
            hint="Sans rôle, le compte se connecte sur un back-office vide."
            required
          />
        </form>
      </Modal>

      {/* Réinitialisation du mot de passe */}
      <Modal
        open={resetting !== null}
        onClose={fermer}
        title={`Nouveau mot de passe pour ${resetting?.nom || resetting?.email || ""}`}
        description="Toutes les sessions ouvertes de ce compte sont fermées immédiatement."
        footer={
          <>
            <Button variant="ghost" onClick={fermer}>
              Annuler
            </Button>
            <Button
              variant="secondary"
              disabled={pending || motDePasse.length < 12}
              onClick={() => {
                if (!resetting) return;
                void reset.run(resetting.id, motDePasse).then((fait) => {
                  if (fait) {
                    fermer();
                    refetch();
                  }
                });
              }}
            >
              {reset.pending ? "Enregistrement…" : "Réinitialiser"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {reset.error && <ErrorBanner error={reset.error} />}
          <Input
            label="Mot de passe"
            type="password"
            autoComplete="new-password"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            error={reset.error?.issueFor("password")}
            hint="12 caractères minimum, avec majuscule, minuscule et chiffre."
            required
          />
        </div>
      </Modal>

      {/* Suppression */}
      <Modal
        open={deleting !== null}
        onClose={fermer}
        title={`Supprimer ${deleting?.nom || deleting?.email || ""} ?`}
        description="Cette action est irréversible."
        footer={
          <>
            <Button variant="ghost" onClick={fermer}>
              Annuler
            </Button>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => {
                if (!deleting) return;
                void remove.run(deleting.id).then((fait) => {
                  if (fait !== null) {
                    fermer();
                    refetch();
                  }
                });
              }}
            >
              Supprimer définitivement
            </Button>
          </>
        }
      >
        {remove.error ? (
          <ErrorBanner error={remove.error} />
        ) : (
          <p className="text-sm text-on-surface-variant">
            Préférez la désactivation : elle ferme l&apos;accès tout en conservant la trace du
            compte et de sa dernière connexion. La suppression est faite pour les créations
            erronées.
          </p>
        )}
      </Modal>
    </div>
  );
}
