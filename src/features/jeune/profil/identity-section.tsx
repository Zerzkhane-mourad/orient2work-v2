"use client";

import { useState } from "react";
import { Avatar, Button, Card, Icon, ImageUpload, Input, Modal, StatusBadge } from "@/components/ui";
import { useProfile } from "./profile-store";

type Editing = "none" | "identity" | "photo" | "banniere";

/** Profile header: cover banner, avatar, identity and contact details. */
export function IdentitySection() {
  const { jeune, update } = useProfile();
  const [editing, setEditing] = useState<Editing>("none");
  const [draft, setDraft] = useState(jeune);
  // Image drafts so "Annuler" genuinely discards the pick.
  const [photoDraft, setPhotoDraft] = useState<string | undefined>(jeune.photo);
  const [banniereDraft, setBanniereDraft] = useState<string | undefined>(jeune.banniere);

  const close = () => setEditing("none");

  const openIdentity = () => {
    setDraft(jeune);
    setEditing("identity");
  };
  const openPhoto = () => {
    setPhotoDraft(jeune.photo);
    setEditing("photo");
  };
  const openBanniere = () => {
    setBanniereDraft(jeune.banniere);
    setEditing("banniere");
  };

  const saveIdentity = (e: React.FormEvent) => {
    e.preventDefault();
    const { prenom, nom, titre, ville, email, telephone } = draft;
    update({ prenom, nom, titre, ville, email, telephone });
    close();
  };

  return (
    <>
      <Card className="overflow-hidden">
        {/* Cover banner */}
        <div className="group relative h-32 sm:h-40">
          {jeune.banniere ? (
            // Data URL from the device — next/image adds no value here.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={jeune.banniere} alt="Bannière du profil" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-r from-primary via-primary-container to-surface-tint" />
          )}
          <button
            type="button"
            onClick={openBanniere}
            aria-label="Modifier la bannière"
            title="Modifier la bannière"
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-lowest/90 text-primary shadow-sm transition-transform hover:scale-105"
          >
            <Icon name="photo_camera" className="text-[18px]" />
          </button>
        </div>

        <div className="px-6 pb-6">
          <div className="-mt-12 mb-3 flex items-end justify-between">
            {/* Avatar with camera badge */}
            <div className="relative">
              <Avatar
                src={jeune.photo}
                alt={`${jeune.prenom} ${jeune.nom}`}
                size={112}
                className="ring-4 ring-surface-container-lowest"
              />
              <button
                type="button"
                onClick={openPhoto}
                aria-label="Modifier la photo de profil"
                title="Modifier la photo de profil"
                className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container ring-2 ring-surface-container-lowest transition-transform hover:scale-105"
              >
                <Icon name="photo_camera" className="text-[18px]" />
              </button>
            </div>

            <Button variant="outline" size="sm" onClick={openIdentity}>
              <Icon name="edit" className="text-[16px]" /> Modifier
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-headline text-2xl font-bold text-primary">
              {jeune.prenom} {jeune.nom}
            </h1>
            <StatusBadge kind="jeune" status={jeune.status} />
          </div>
          <p className="font-semibold text-on-surface-variant">{jeune.titre}</p>

          <div className="mt-2 flex flex-wrap gap-4 text-sm text-on-surface-variant">
            <span className="flex items-center gap-1">
              <Icon name="location_on" className="text-[16px]" /> {jeune.ville}
            </span>
            <span className="flex items-center gap-1">
              <Icon name="mail" className="text-[16px]" /> {jeune.email}
            </span>
            <span className="flex items-center gap-1">
              <Icon name="call" className="text-[16px]" /> {jeune.telephone}
            </span>
          </div>
        </div>
      </Card>

      {/* Identity fields */}
      <Modal
        open={editing === "identity"}
        onClose={close}
        title="Informations personnelles"
        description="Ces informations sont visibles par les entreprises validées."
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              Annuler
            </Button>
            <Button variant="secondary" form="identity-form" type="submit">
              Enregistrer
            </Button>
          </>
        }
      >
        <form id="identity-form" onSubmit={saveIdentity} className="grid gap-5 sm:grid-cols-2">
          <Input
            label="Prénom"
            required
            value={draft.prenom}
            onChange={(e) => setDraft({ ...draft, prenom: e.target.value })}
          />
          <Input
            label="Nom"
            required
            value={draft.nom}
            onChange={(e) => setDraft({ ...draft, nom: e.target.value })}
          />
          <div className="sm:col-span-2">
            <Input
              label="Titre professionnel"
              hint="Ex. : Étudiant en informatique — recherche alternance"
              required
              value={draft.titre}
              onChange={(e) => setDraft({ ...draft, titre: e.target.value })}
            />
          </div>
          <Input
            label="Email"
            type="email"
            required
            value={draft.email}
            onChange={(e) => setDraft({ ...draft, email: e.target.value })}
          />
          <Input
            label="Téléphone"
            type="tel"
            required
            value={draft.telephone}
            onChange={(e) => setDraft({ ...draft, telephone: e.target.value })}
          />
          <div className="sm:col-span-2">
            <Input
              label="Ville"
              required
              value={draft.ville}
              onChange={(e) => setDraft({ ...draft, ville: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* Avatar upload */}
      <Modal
        open={editing === "photo"}
        onClose={close}
        title="Photo de profil"
        description="Une photo professionnelle augmente nettement les vues de votre profil."
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              Annuler
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                update({ photo: photoDraft });
                close();
              }}
            >
              Enregistrer
            </Button>
          </>
        }
      >
        <ImageUpload
          value={photoDraft}
          onChange={setPhotoDraft}
          shape="circle"
          maxWidth={512}
          maxHeight={512}
          emptyLabel="Ajouter une photo"
          hint="JPG, PNG ou WebP — 5 Mo max."
        />
      </Modal>

      {/* Banner upload */}
      <Modal
        open={editing === "banniere"}
        onClose={close}
        title="Bannière du profil"
        description="Une image large (environ 1200 × 300) donne le meilleur rendu."
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              Annuler
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                update({ banniere: banniereDraft });
                close();
              }}
            >
              Enregistrer
            </Button>
          </>
        }
      >
        <ImageUpload
          value={banniereDraft}
          onChange={setBanniereDraft}
          shape="wide"
          maxWidth={1600}
          maxHeight={500}
          emptyLabel="Ajouter une bannière"
          hint="Sans image, le dégradé Orient2Work est utilisé."
        />
      </Modal>
    </>
  );
}
