"use client";

/**
 * Partage d'une offre — email, réseaux, lien.
 *
 * Une offre se transmet : à un ami de promo, à un parent, à un conseiller. Sans
 * ces boutons, il fallait copier l'adresse à la main depuis la barre du
 * navigateur — ce que presque personne ne fait sur téléphone.
 *
 * Le lien partagé est celui de la page : l'offre n'a pas de fiche publique, le
 * destinataire se connecte donc avant de la lire — ce qui convient au cas
 * d'usage, un jeune qui la transmet à un autre.
 *
 * Les logos de marque viennent de `react-icons/fa6` directement, et non du
 * registre `Icon` : ce ne sont pas des icônes SÉMANTIQUES (« partager ») mais
 * des marques, qui ne changent pas de sens d'un écran à l'autre.
 */
import { useEffect, useState } from "react";
import { FaFacebookF, FaLinkedinIn, FaXTwitter } from "react-icons/fa6";
import type { IconType } from "react-icons";
import { Icon, type IconName } from "@/components/ui";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface PartagerOffreProps {
  titre: string;
  entreprise: string;
  className?: string;
}

/** Durée d'affichage d'un avis de copie avant retour à l'état normal. */
const AVIS_MS = 4000;

/** Ce que la dernière copie a mis dans le presse-papiers. */
type Avis = "lien" | "message" | null;

/**
 * Message proposé par défaut — une phrase d'accroche, l'offre, le lien, deux
 * mots-clés. Assez neutre pour être publié tel quel, assez court pour être
 * retouché.
 */
function messageParDefaut(titre: string, entreprise: string, url: string): string {
  return [
    `Offre à découvrir : ${titre} chez ${entreprise}.`,
    `Elle pourrait intéresser quelqu'un de votre réseau — à partager !`,
    url,
    `#emploi #${APP_NAME}`,
  ].join("\n\n");
}

export function PartagerOffre({ titre, entreprise, className }: PartagerOffreProps) {
  // L'adresse n'existe qu'au navigateur : lue après le montage, pour que le
  // rendu serveur et le premier rendu client restent identiques.
  const [url, setUrl] = useState("");
  const [avis, setAvis] = useState<Avis>(null);

  useEffect(() => setUrl(window.location.href), []);

  useEffect(() => {
    if (!avis) return;
    const minuteur = window.setTimeout(() => setAvis(null), AVIS_MS);
    return () => window.clearTimeout(minuteur);
  }, [avis]);

  const message = messageParDefaut(titre, entreprise, url);
  const u = encodeURIComponent(url);
  const m = encodeURIComponent(message);

  const copier = async (contenu: string, quoi: Exclude<Avis, null>) => {
    try {
      await navigator.clipboard.writeText(contenu);
      setAvis(quoi);
    } catch {
      /* Presse-papiers refusé (contexte non sécurisé) : le partage s'ouvre quand même. */
    }
  };

  /*
   * Chaque réseau accepte — ou non — un texte prérempli :
   *  • LinkedIn : `share-offsite` n'accepte QUE l'adresse. Le compositeur de
   *    publication (`feed/?shareActive`) reçoit le message complet, lien compris ;
   *  • X : message et lien, dans l'intention de tweet ;
   *  • Facebook : AUCUN préremplissage n'est permis par sa politique — le
   *    paramètre `quote` est ignoré. Le message est donc copié au clic, et un
   *    avis invite à le coller.
   */
  const liens: {
    libelle: string;
    href: string;
    logo: IconType;
    teinte: string;
    auClic?: () => void;
  }[] = [
    {
      libelle: "Partager sur LinkedIn",
      href: `https://www.linkedin.com/feed/?shareActive=true&text=${m}`,
      logo: FaLinkedinIn,
      teinte: "bg-[#0A66C2] text-white hover:bg-[#0A66C2]/90",
    },
    {
      libelle: "Partager sur X",
      // Le lien est déjà DANS le message : le passer aussi en `url` le
      // ferait apparaître deux fois.
      href: `https://twitter.com/intent/tweet?text=${m}`,
      logo: FaXTwitter,
      // Tokens et non noir fixe : le logo X reste visible en thème sombre.
      teinte: "bg-on-surface text-surface hover:bg-on-surface/85",
    },
    {
      libelle: "Partager sur Facebook (le message est copié)",
      href: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
      logo: FaFacebookF,
      teinte: "bg-[#1877F2] text-white hover:bg-[#1877F2]/90",
      // Pas de `preventDefault` : la copie part, ET l'onglet s'ouvre.
      auClic: () => void copier(message, "message"),
    },
  ];

  return (
    <div className={cn("relative flex flex-wrap items-center gap-2", className)}>
      <span className="mr-1 text-sm font-bold text-primary">Partager</span>

      <BoutonOutil
        libelle="Partager par email"
        icon="mail"
        href={`mailto:?subject=${encodeURIComponent(`${titre} — ${entreprise}`)}&body=${m}`}
      />

      {liens.map(({ libelle, href, logo: Logo, teinte, auClic }) => (
        <a
          key={libelle}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={auClic}
          aria-label={libelle}
          title={libelle}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg shadow-sm transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2",
            teinte,
          )}
        >
          <Logo className="text-[17px]" aria-hidden />
        </a>
      ))}

      <BoutonOutil
        libelle={avis === "lien" ? "Lien copié" : "Copier le lien"}
        icon={avis === "lien" ? "check" : "link"}
        onClick={() => void copier(url, "lien")}
        actif={avis === "lien"}
      />

      {/* Avis visible ET annoncé : après un partage Facebook, il dit quoi faire
          ensuite — l'onglet ouvert ne le dira pas. */}
      <p
        aria-live="polite"
        className={cn(
          "flex basis-full items-center gap-1.5 text-xs font-semibold text-success transition-opacity duration-200",
          avis ? "opacity-100" : "h-0 opacity-0",
        )}
      >
        {avis && <Icon name="check_circle" className="text-[15px]" />}
        {avis === "message"
          ? "Message copié — collez-le dans votre publication Facebook (Ctrl+V)."
          : avis === "lien"
            ? "Lien de l'offre copié."
            : ""}
      </p>
    </div>
  );
}

/** Bouton carré neutre, dans la famille des logos de marque. */
function BoutonOutil({
  libelle,
  icon,
  href,
  onClick,
  actif,
}: {
  libelle: string;
  icon: IconName;
  href?: string;
  onClick?: () => void;
  actif?: boolean;
}) {
  const classes = cn(
    "flex h-10 w-10 items-center justify-center rounded-lg shadow-sm transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2",
    actif ? "bg-success text-white" : "bg-primary text-on-primary hover:bg-primary/90",
  );
  const contenu = <Icon name={icon} className="text-[19px]" />;

  return href ? (
    <a href={href} aria-label={libelle} title={libelle} className={classes}>
      {contenu}
    </a>
  ) : (
    <button type="button" onClick={onClick} aria-label={libelle} title={libelle} className={classes}>
      {contenu}
    </button>
  );
}
