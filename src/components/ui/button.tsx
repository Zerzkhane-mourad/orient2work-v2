import { forwardRef } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap rounded-full transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-container shadow-sm",
  secondary: "bg-secondary-container text-on-secondary-container hover:brightness-105 shadow-sm",
  outline: "border border-primary text-primary hover:bg-primary/5",
  ghost: "text-on-surface-variant hover:bg-surface-container",
  danger: "bg-error text-on-error hover:brightness-110",
};

/**
 * Les hauteurs minimales sont là pour la CIBLE TACTILE, pas pour l'allure : le
 * remplissage seul donnait 32px en `sm` et 40px en `md`, sous le seuil de 44px
 * en dessous duquel un bouton se rate au pouce. `sm` reste volontairement plus
 * bas (36px) : il ne sert que dans les contextes denses — tableaux, cartes —
 * où il est entouré de marge.
 */
const sizes: Record<Size, string> = {
  sm: "min-h-9 px-4 py-1.5 text-sm",
  md: "min-h-11 px-6 py-2.5 text-sm",
  lg: "min-h-12 px-8 py-3.5 text-base",
};

interface ButtonBaseProps {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

export interface ButtonProps
  extends ButtonBaseProps, React.ButtonHTMLAttributes<HTMLButtonElement> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", fullWidth, className, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], fullWidth && "w-full", className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export interface ButtonLinkProps extends ButtonBaseProps, React.ComponentProps<typeof Link> {}

/** A link styled as a button — for navigation actions. */
export function ButtonLink({
  variant = "primary",
  size = "md",
  fullWidth,
  className,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={cn(base, variants[variant], sizes[size], fullWidth && "w-full", className)}
      {...props}
    />
  );
}
