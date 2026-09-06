import { Card, CardBody } from "./card";
import { Icon, type IconName } from "./icon";
import { cn } from "@/lib/utils";

interface StatProps {
  label: string;
  value: string | number;
  icon?: IconName;
  /** Optional trend/delta caption, e.g. "+12% ce mois". */
  caption?: string;
  className?: string;
}

/** KPI tile used across dashboards and the admin statistics page. */
export function Stat({ label, value, icon, caption, className }: StatProps) {
  return (
    <Card className={className}>
      <CardBody className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-on-surface-variant">{label}</p>
          <p className="font-headline text-3xl font-bold text-primary">{value}</p>
          {caption && <p className="text-xs text-on-surface-variant">{caption}</p>}
        </div>
        {icon && (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-secondary-container text-on-secondary-container">
            <Icon name={icon} />
          </span>
        )}
      </CardBody>
    </Card>
  );
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  /**
   * Échelle du titre.
   *
   * `lg` (32px) pour les espaces à barre LATÉRALE — administration, entreprise :
   * le titre y est le seul repère de position en haut de la zone de contenu.
   * `sm` (20px) pour l'Espace Jeune, dont la barre supérieure porte déjà
   * l'onglet actif : un second titre de 32px sous une barre de navigation
   * répète l'information et repousse le contenu d'un demi-écran sur mobile.
   *
   * Les cinq écrans de l'Espace Jeune écrivaient chacun ce bloc à la main, à
   * la même taille mais sans emplacement d'actions ; c'est ce dernier qui
   * manquait, d'où des sélecteurs posés au-dessus ou en dessous selon la page.
   */
  size?: "lg" | "sm";
  className?: string;
}

/** Standard page title block for dashboard/app pages. */
export function PageHeader({ title, subtitle, actions, size = "lg", className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="space-y-1">
        <h1
          className={cn(
            "font-headline font-bold text-primary",
            size === "lg" ? "text-headline-lg" : "text-xl",
          )}
        >
          {title}
        </h1>
        {subtitle && (
          <p className={cn("text-on-surface-variant", size === "sm" && "text-sm")}>{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}
