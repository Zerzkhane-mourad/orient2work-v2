import { Card, CardBody } from "./card";
import { Icon } from "./icon";
import { cn } from "@/lib/utils";

interface StatProps {
  label: string;
  value: string | number;
  icon?: string;
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
  className?: string;
}

/** Standard page title block for dashboard/app pages. */
export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="space-y-1">
        <h1 className="font-headline text-headline-lg font-bold text-primary">{title}</h1>
        {subtitle && <p className="text-on-surface-variant">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}
