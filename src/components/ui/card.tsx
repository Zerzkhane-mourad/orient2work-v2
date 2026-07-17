import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Add a subtle lift + scale on hover (used for interactive cards). */
  interactive?: boolean;
}

/** Level-1 elevated content container, 16px radius, 1px border. */
export function Card({ interactive, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-outline-variant bg-surface-container-lowest shadow-level-1",
        interactive &&
          "transition-all hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-level-2 cursor-pointer",
        className,
      )}
      {...props}
    />
  );
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6", className)} {...props} />;
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center justify-between gap-4 px-6 pt-6", className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("font-headline text-lg font-bold text-primary", className)} {...props} />;
}
