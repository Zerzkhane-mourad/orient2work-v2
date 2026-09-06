"use client";

import { useState } from "react";
import {
  Button,
  Card,
  CardBody,
  ErrorBanner,
  Icon,
  Input,
  SuccessBanner,
  Textarea,
} from "@/components/ui";
import { api } from "@/lib/api";
import { useMutation } from "@/lib/api/use-api";

const EMPTY = { nom: "", email: "", sujet: "", message: "" };

/** Formulaire de contact public (§ page Contact). */
export function ContactForm() {
  const [form, setForm] = useState(EMPTY);
  const [sent, setSent] = useState(false);

  const { run, pending, error } = useMutation(api.contact.send);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = await run(form);
    if (result) {
      setSent(true);
      setForm(EMPTY);
    }
  };

  const set = (field: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <Card className="lg:col-span-2">
      <CardBody>
        {sent ? (
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success-container text-success">
              <Icon name="check_circle" filled className="text-2xl" />
            </span>
            <div>
              <h3 className="font-headline text-xl font-bold text-primary">Message envoyé</h3>
              <p className="mt-1 text-sm text-on-surface-variant">
                L&apos;équipe OMB vous répond sous 48h ouvrées.
              </p>
            </div>
            <Button variant="ghost" onClick={() => setSent(false)}>
              Envoyer un autre message
            </Button>
          </div>
        ) : (
          <form className="grid gap-5 sm:grid-cols-2" onSubmit={submit} noValidate>
            {error && (
              <div className="sm:col-span-2">
                <ErrorBanner error={error} />
              </div>
            )}

            <Input
              label="Nom complet"
              placeholder="Votre nom"
              value={form.nom}
              onChange={set("nom")}
              error={error?.issueFor("nom")}
              required
            />
            <Input
              label="Email"
              type="email"
              placeholder="vous@email.com"
              value={form.email}
              onChange={set("email")}
              error={error?.issueFor("email")}
              required
            />
            <div className="sm:col-span-2">
              <Input
                label="Sujet"
                placeholder="Objet de votre message"
                value={form.sujet}
                onChange={set("sujet")}
                error={error?.issueFor("sujet")}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <Textarea
                label="Message"
                placeholder="Votre message…"
                rows={6}
                maxLength={5000}
                value={form.message}
                onChange={set("message")}
                error={error?.issueFor("message")}
                hint={`${form.message.length}/5000 caractères — 10 minimum.`}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" size="lg" disabled={pending}>
                {pending ? "Envoi…" : "Envoyer le message"}
              </Button>
            </div>
          </form>
        )}
      </CardBody>
    </Card>
  );
}

/** Inscription à la newsletter — compacte, pour le pied de page. */
export function NewsletterForm({ className }: { className?: string }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const { run, pending, error } = useMutation(api.contact.subscribe);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = await run(email);
    if (result) {
      setSent(true);
      setEmail("");
    }
  };

  if (sent) {
    return (
      <div className={className}>
        {/* Message volontairement neutre : il ne dit pas si l'adresse était
            déjà inscrite. */}
        <SuccessBanner message="Inscription enregistrée. Vérifiez votre boîte email." />
      </div>
    );
  }

  return (
    <form className={className} onSubmit={submit} noValidate>
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="vous@email.com"
          aria-label="Adresse email pour la newsletter"
          required
          className="min-w-0 flex-1 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
        />
        <Button type="submit" variant="secondary" size="sm" disabled={pending}>
          {pending ? "…" : "S'inscrire"}
        </Button>
      </div>
      {error && <ErrorBanner error={error} className="mt-2" />}
    </form>
  );
}
