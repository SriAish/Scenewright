import { ReactNode } from "react";

export interface EmptyStateProps {
  heading: string;
  copy: string;
  action?: ReactNode;
  className?: string;
}

/**
 * Quiet, illustration-free empty-state block: heading, one line of
 * copy, optional action slot. Source: library / dashboard empty states.
 */
export function EmptyState({ heading, copy, action, className }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center gap-sm text-center max-w-[360px] mx-auto ${className ?? ""}`}>
      <div className="text-[17px] font-semibold text-text-primary">{heading}</div>
      <div className="text-ui text-text-secondary leading-[1.5]">{copy}</div>
      {action && <div className="mt-[4px]">{action}</div>}
    </div>
  );
}
