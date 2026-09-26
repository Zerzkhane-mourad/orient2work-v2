/**
 * Page « Contact ».
 *
 * Le formulaire est la raison d'être de la page : il prend la colonne large et
 * vient en premier dans le flux. Les coordonnées passent en liste simple à
 * côté ; quatre cartes empilées faisaient jeu égal avec lui.
 *
 * Pas de bloc newsletter ici : le pied de page porte déjà le formulaire
 * d'inscription, deux écrans plus bas il aurait été en double.
 */
import type { Metadata } from "next";
import { Reveal } from "@/components/motion/reveal";
import { Icon } from "@/components/ui";
import { ContactForm } from "@/features/contact/contact-form";

const DESCRIPTION = "Contactez l'équipe Orient2Work by OMB.";

export const metadata: Metadata = {
  title: "Contact",
  description: DESCRIPTION,
  openGraph: { title: "Contact | Orient2Work by OMB", description: DESCRIPTION },
};

const CANAUX = [
  { icon: "mail", label: "Email", value: "contact@orient2work.ma", href: "mailto:contact@orient2work.ma" },
  { icon: "call", label: "Téléphone", value: "+212 5 22 00 00 00", href: "tel:+212522000000" },
  { icon: "location_on", label: "Adresse", value: "Casablanca, Maroc" },
] as const;

export default function ContactPage() {
  return (
    <>
      {/* Remonte sous l'en-tête sans fond, comme les autres pages publiques. */}
      <section className="-mt-20 bg-surface-container-low pb-16 pt-40 lg:pb-20 lg:pt-44">
        <Reveal
          auChargement
          className="mx-auto max-w-container-max px-margin-mobile lg:px-margin-desktop"
        >
          <p className="font-semibold text-secondary">Contact</p>
          <h1 className="mt-3 max-w-3xl text-balance font-headline text-4xl font-extrabold leading-[1.05] tracking-tight text-primary sm:text-5xl">
            Une question ? Écrivez-nous
          </h1>
          <p className="mt-6 max-w-xl text-lg text-on-surface-variant">
            L&apos;équipe OMB vous répond sous 48h ouvrées.
          </p>
        </Reveal>
      </section>

      <section className="mx-auto max-w-container-max px-margin-mobile py-16 lg:px-margin-desktop lg:py-20">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <Reveal className="lg:col-span-8">
            <ContactForm />
          </Reveal>

          <Reveal as="ul" cascade delai={0.1} className="space-y-7 lg:col-span-4 lg:pt-6">
            {CANAUX.map((canal) => (
              <li key={canal.label} className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-secondary-container text-on-secondary-container">
                  <Icon name={canal.icon} aria-hidden />
                </span>
                <div>
                  <p className="text-sm text-on-surface-variant">{canal.label}</p>
                  <p className="font-semibold text-primary">
                    {"href" in canal ? (
                      <a
                        href={canal.href}
                        className="underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
                      >
                        {canal.value}
                      </a>
                    ) : (
                      canal.value
                    )}
                  </p>
                </div>
              </li>
            ))}
          </Reveal>
        </div>
      </section>
    </>
  );
}
