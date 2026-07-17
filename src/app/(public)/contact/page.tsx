import type { Metadata } from "next";
import { SectionHeading } from "@/components/marketing/section-heading";
import { Button, Card, CardBody, Icon, Input, Textarea } from "@/components/ui";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contactez l'équipe Orient2Work by OMB.",
};

const channels = [
  { icon: "mail", label: "Email", value: "contact@orient2work.ma" },
  { icon: "call", label: "Téléphone", value: "+212 5 22 00 00 00" },
  { icon: "location_on", label: "Adresse", value: "Casablanca, Maroc" },
];

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-container-max px-margin-mobile py-16 lg:px-margin-desktop">
      <SectionHeading
        eyebrow="Contact"
        title="Une question ? Écrivez-nous"
        subtitle="L'équipe OMB vous répond sous 48h ouvrées."
        className="mb-12"
      />
      <div className="grid gap-10 lg:grid-cols-3">
        <div className="space-y-4">
          {channels.map((c) => (
            <Card key={c.label}>
              <CardBody className="flex items-center gap-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-secondary-container text-on-secondary-container">
                  <Icon name={c.icon} />
                </span>
                <div>
                  <p className="text-sm text-on-surface-variant">{c.label}</p>
                  <p className="font-semibold text-primary">{c.value}</p>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>

        <Card className="lg:col-span-2">
          <CardBody>
            <form className="grid gap-5 sm:grid-cols-2">
              <Input label="Nom complet" placeholder="Votre nom" required />
              <Input label="Email" type="email" placeholder="vous@email.com" required />
              <Input label="Sujet" placeholder="Objet de votre message" className="sm:col-span-2" />
              <div className="sm:col-span-2">
                <Textarea label="Message" placeholder="Votre message…" rows={6} required />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" size="lg">
                  Envoyer le message
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
