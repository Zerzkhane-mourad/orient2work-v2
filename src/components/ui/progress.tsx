import { cn } from "@/lib/utils";

interface ProgressBarProps {
  /** 0–100. */
  value: number;
  className?: string;
  barClassName?: string;
}

/** Horizontal gold progress bar. */
export function ProgressBar({ value, className, barClassName }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-surface-variant", className)}>
      <div
        className={cn("h-full rounded-full bg-secondary-container transition-all", barClassName)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

interface ProgressRingProps {
  /** 0–100. */
  value: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}

/** Circular progress indicator with a centered percentage. */
export function ProgressRing({ value, size = 64, strokeWidth = 6, label }: ProgressRingProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-surface-variant"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="stroke-secondary-container transition-all duration-700"
        />
      </svg>
      <span className="absolute text-xs font-bold text-primary">{label ?? `${Math.round(clamped)}%`}</span>
    </div>
  );
}
