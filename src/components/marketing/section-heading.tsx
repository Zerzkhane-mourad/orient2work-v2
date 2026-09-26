import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  className?: string;
}

/**
 * En-tête de section du site public.
 *
 * SANS surtitre : le petit label en capitales posé au-dessus de chaque titre
 * produit le rythme répétitif qui trahit une page composée à la chaîne, et la
 * position de la section suffit à la situer. Le titre porte seul.
 *
 * Aligné à gauche, comme tous les titres de la vitrine : un en-tête centré
 * isolé au milieu de pages ferrées à gauche se lit comme une erreur.
 */
export function SectionHeading({ title, subtitle, className }: SectionHeadingProps) {
  return (
    <Reveal className={cn("mb-10 max-w-2xl space-y-3 lg:mb-12", className)}>
      <h2 className="text-balance font-headline text-3xl font-bold tracking-tight text-primary sm:text-4xl">
        {title}
      </h2>
      {subtitle && <p className="text-pretty text-lg text-on-surface-variant">{subtitle}</p>}
    </Reveal>
  );
}
