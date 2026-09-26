"use client";

/**
 * Création et modification d'un rôle d'administration.
 *
 * ── Une page, pas une modale ────────────────────────────────────────────────
 *
 * La matrice compte une vingtaine de cases réparties en six domaines : dans une
 * modale elle imposait son propre ascenseur, à l'intérieur d'une fenêtre qui en
 * avait déjà un. On perdait de vue les champs d'identité en cochant, et le
 * contexte — combien de comptes portent ce rôle, ce qu'il ouvre — ne tenait
 * nulle part. En page pleine, la colonne de droite porte ce contexte en
 * permanence pendant qu'on coche à gauche.
 *
 * ── L'aperçu du menu ────────────────────────────────────────────────────────
 *
 * Un rôle ne se juge pas à son nombre de cases mais à ce qu'il OUVRE. L'aperçu
 * est calculé par `filterNav`, la fonction qui filtre la vraie barre latérale :
 * il montre donc exactement le menu que verra le titulaire, et ne peut pas
 * diverger de lui.
 */
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  ErrorBanner,
  Icon,
  Input,
  RetourLien,
  Skeleton,
  Textarea,
} from "@/components/ui";
import {
  compterPermissions,
  CouverturePermissions,
  PermissionMatrix,
} from "@/features/admin/permission-matrix";
import { api } from "@/lib/api";
import type { ApiRoleAdmin, Permission } from "@/lib/api/types";
import { useApi, useMutation } from "@/lib/api/use-api";
import { useCan } from "@/features/auth/use-permissions";
import { adminNav, filterNav, isNavGroup } from "@/lib/navigation";

const NOM_MAX = 60;
const DESCRIPTION_MAX = 300;

export function RoleEditor({ role }: { role?: ApiRoleAdmin }) {
  const router = useRouter();
  const edition = Boolean(role);

  /*
   * Deux verrous distincts, qu'il ne faut pas confondre :
   *  • `lectureSeule` — l'appelant n'a que `roles:read`. La liste l'amène ici
   *    par un bouton « Voir », l'écran devient une fiche de consultation.
   *  • `permissionsFigees` — rôle système : son identité reste modifiable, mais
   *    ses permissions sont calculées et le serveur refuse de les recevoir.
   */
  const lectureSeule = !useCan("roles:write");
  const permissionsFigees = lectureSeule || (role?.systeme ?? false);

  const [nom, setNom] = useState(role?.nom ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [permissions, setPermissions] = useState<Permission[]>(role?.permissions ?? []);

  const catalogue = useApi(() => api.admin.permissions(), []);
  const groupes = useMemo(() => catalogue.data ?? [], [catalogue.data]);
  const total = compterPermissions(groupes);

  const create = useMutation(api.admin.createRole);
  const update = useMutation(api.admin.updateRole);
  const pending = create.pending || update.pending;
  const error = create.error ?? update.error;

  /*
   * Aperçu du menu, calculé avec la fonction de la vraie barre latérale.
   * Les entrées sans permission déclarée (Dashboard, Entretiens, Paramètres)
   * en font partie : elles sont ouvertes à tout administrateur, et les
   * masquer ici donnerait une idée fausse de ce que le titulaire verra.
   */
  const menu = useMemo(() => {
    const detenues = new Set(permissions);
    return filterNav(
      adminNav,
      (...requises) => requises.length === 0 || requises.some((p) => detenues.has(p)),
    );
  }, [permissions]);

  const nomValide = nom.trim().length >= 2;
  const modifie =
    !edition ||
    nom !== role!.nom ||
    description !== role!.description ||
    permissions.length !== role!.permissions.length ||
    permissions.some((p) => !role!.permissions.includes(p));

  const enregistrer = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!nomValide) return;

    const identite = { nom: nom.trim(), description: description.trim() };

    const enregistre = role
      ? await update.run(role.id, {
          ...identite,
          // Les renvoyer sur un rôle système se ferait refuser en 403.
          ...(permissionsFigees ? {} : { permissions }),
        })
      : await create.run({ ...identite, permissions });

    if (enregistre) {
      // `refresh` en plus de `push` : la liste est un composant client qui
      // garderait sa réponse en cache et n'afficherait pas le rôle créé.
      router.push("/admin/roles");
      router.refresh();
    }
  };

  return (
    <form onSubmit={(e) => void enregistrer(e)} className="space-y-6">
      <div className="space-y-3">
        <RetourLien href="/admin/roles">Retour aux rôles</RetourLien>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <h1 className="font-headline text-headline-lg font-bold text-primary">
              {edition ? nom || "Rôle sans nom" : "Nouveau rôle"}
            </h1>
            <p className="text-on-surface-variant">
              {lectureSeule
                ? "Consultation : la modification des rôles demande la permission « roles:write »."
                : role?.systeme
                  ? "Rôle système : son nom se modifie, ses permissions couvrent tout le catalogue."
                  : "Cochez ce que ce profil d'administrateur pourra consulter et modifier."}
            </p>
          </div>

          <div className="flex shrink-0 gap-2">
            <ButtonLink href="/admin/roles" variant={lectureSeule ? "secondary" : "ghost"}>
              {lectureSeule ? "Fermer" : "Annuler"}
            </ButtonLink>
            {!lectureSeule && (
              <Button
                type="submit"
                variant="secondary"
                disabled={pending || !nomValide || !modifie}
                title={!modifie ? "Aucune modification à enregistrer" : undefined}
              >
                <Icon name="save" className="text-[18px]" />
                {pending ? "Enregistrement…" : edition ? "Enregistrer" : "Créer le rôle"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {error && <ErrorBanner error={error} />}
      {catalogue.error && <ErrorBanner error={catalogue.error} />}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Identité</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4 pt-4">
              <Input
                label="Nom du rôle"
                placeholder="Modérateur des contenus"
                value={nom}
                maxLength={NOM_MAX}
                onChange={(e) => setNom(e.target.value)}
                error={error?.issueFor("nom")}
                hint={`2 à ${NOM_MAX} caractères, unique. ${NOM_MAX - nom.length} restants.`}
                disabled={lectureSeule}
                required
              />
              <Textarea
                label="Description (facultatif)"
                rows={2}
                maxLength={DESCRIPTION_MAX}
                placeholder="Ce que ce rôle est censé prendre en charge au quotidien."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                error={error?.issueFor("description")}
                hint="Lue dans la liste des rôles et au moment d'affecter un compte."
                disabled={lectureSeule}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Permissions</CardTitle>
              <span className="text-xs text-on-surface-variant tabular-nums">
                {permissions.length} / {total || "…"}
              </span>
            </CardHeader>
            <CardBody className="pt-4">
              {catalogue.loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-28 w-full" />
                  ))}
                </div>
              ) : (
                <PermissionMatrix
                  groupes={groupes}
                  valeur={permissions}
                  onChange={setPermissions}
                  lectureSeule={permissionsFigees}
                />
              )}
            </CardBody>
          </Card>
        </div>

        {/*
         * `self-start` + `sticky` : la colonne suit le défilement de la matrice.
         * Sans cela, le décompte et l'aperçu disparaissent dès le deuxième
         * domaine — précisément au moment où l'on veut vérifier son choix.
         */}
        <aside className="space-y-6 self-start lg:sticky lg:top-6">
          <Card>
            <CardHeader>
              <CardTitle>Portée</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4 pt-4">
              <CouverturePermissions retenues={permissions.length} total={total} />

              {permissions.length === 0 && !permissionsFigees && !lectureSeule && (
                <p className="flex items-start gap-2 rounded-lg bg-warning-container px-3 py-2 text-xs text-on-warning-container">
                  <Icon name="warning" className="mt-0.5 shrink-0 text-[14px]" />
                  Sans permission, ce rôle ne donne accès à aucun écran. Ses titulaires se
                  connecteront sur un back-office vide.
                </p>
              )}

              {edition && (
                <p className="flex items-start gap-2 border-t border-outline-variant pt-3 text-xs text-on-surface-variant">
                  <Icon name="groups" className="mt-0.5 shrink-0 text-[14px]" />
                  {role!.utilisateurs === 0
                    ? "Aucun compte ne porte encore ce rôle."
                    : `${role!.utilisateurs} compte(s) portent ce rôle : la modification prend effet immédiatement pour eux.`}
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Menu du titulaire</CardTitle>
            </CardHeader>
            <CardBody className="pt-4">
              <p className="mb-3 text-xs text-on-surface-variant">
                Ce que verra un administrateur portant ce rôle.
              </p>
              <ul className="space-y-1">
                {menu.map((entree) => (
                  <li key={entree.label}>
                    <span className="flex items-center gap-2 rounded-lg bg-surface-container-low px-2.5 py-1.5 text-sm text-on-surface">
                      <Icon name={entree.icon} className="text-[16px] text-on-surface-variant" />
                      {entree.label}
                    </span>
                    {isNavGroup(entree) && (
                      <ul className="ml-4 mt-1 space-y-1 border-l border-outline-variant pl-3">
                        {entree.children.map((enfant) => (
                          <li
                            key={enfant.href}
                            className="text-xs text-on-surface-variant"
                          >
                            {enfant.label}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </aside>
      </div>
    </form>
  );
}
