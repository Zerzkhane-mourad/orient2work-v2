"use client";

import { useState } from "react";
import { Button, Icon, Input, Modal, Select } from "@/components/ui";
import { LIEN_TYPES, type LienType } from "@/lib/types";
import { EditableCard } from "./editable-card";
import { useProfile } from "./profile-store";

const ICONS: Record<LienType, string> = {
  LinkedIn: "business_center",
  GitHub: "code",
  Portfolio: "link",
  "Site personnel": "language",
  Autre: "link",
};

/** Professional links (§5.2 — documents et liens). */
export function LinksSection() {
  const { jeune, addLien, removeLien } = useProfile();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<LienType>("LinkedIn");
  const [url, setUrl] = useState("");

  const openModal = () => {
    setType("LinkedIn");
    setUrl("");
    setOpen(true);
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    addLien({ type, url: url.trim() });
    setOpen(false);
  };

  return (
    <>
      <EditableCard title="Liens" actionIcon="add" actionLabel="Ajouter un lien" onAction={openModal}>
        {jeune.liens.length === 0 ? (
          <p className="text-sm text-on-surface-variant">
            Ajoutez votre LinkedIn, GitHub ou portfolio pour renforcer votre profil.
          </p>
        ) : (
          <div className="space-y-1">
            {jeune.liens.map((lien) => (
              <div
                key={lien.id}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-container-low"
              >
                <Icon name={ICONS[lien.type]} className="text-[18px] text-on-surface-variant" />
                <a
                  href={lien.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1 truncate text-sm text-on-surface-variant hover:text-primary hover:underline"
                >
                  {lien.type}
                </a>
                <button
                  type="button"
                  onClick={() => removeLien(lien.id)}
                  aria-label={`Retirer ${lien.type}`}
                  className="rounded-full p-1.5 text-on-surface-variant hover:bg-error-container hover:text-error"
                >
                  <Icon name="close" className="text-[14px]" />
                </button>
              </div>
            ))}
          </div>
        )}
      </EditableCard>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Ajouter un lien"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button variant="secondary" form="link-form" type="submit">
              Ajouter
            </Button>
          </>
        }
      >
        <form id="link-form" onSubmit={save} className="space-y-5">
          <Select label="Type" value={type} onChange={(e) => setType(e.target.value as LienType)}>
            {LIEN_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
          <Input
            label="URL"
            type="url"
            required
            placeholder="https://linkedin.com/in/votre-profil"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </form>
      </Modal>
    </>
  );
}
