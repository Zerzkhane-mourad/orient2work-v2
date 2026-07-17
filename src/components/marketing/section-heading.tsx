import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  centered?: boolean;
  className?: string;
}

/** Reusable marketing section title block. */
export function SectionHeading({ eyebrow, title, subtitle, centered, className }: SectionHeadingProps) {
  return (
    <div className={cn(centered && "mx-auto text-center", "max-w-2xl space-y-3", className)}>
      {eyebrow && (
        <span className="text-sm font-bold uppercase tracking-widest text-secondary">{eyebrow}</span>
      )}
      <h2 className="font-headline text-3xl font-bold text-primary lg:text-4xl">{title}</h2>
      {subtitle && <p className="text-lg text-on-surface-variant">{subtitle}</p>}
    </div>
  );
}
