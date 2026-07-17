"use client";

import { Card, CardBody, Icon } from "@/components/ui";

interface EditableCardProps {
  title: string;
  /** Icon for the action button — "edit" by default, "add" for collections. */
  actionIcon?: string;
  actionLabel: string;
  onAction: () => void;
  children: React.ReactNode;
}

/** Section card with a title and a single edit/add affordance. */
export function EditableCard({
  title,
  actionIcon = "edit",
  actionLabel,
  onAction,
  children,
}: EditableCardProps) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-4 px-6 pt-5">
        <h2 className="font-headline text-lg font-bold text-primary">{title}</h2>
        <button
          type="button"
          onClick={onAction}
          aria-label={actionLabel}
          title={actionLabel}
          className="rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary"
        >
          <Icon name={actionIcon} className="text-[20px]" />
        </button>
      </div>
      <CardBody className="pt-3">{children}</CardBody>
    </Card>
  );
}
