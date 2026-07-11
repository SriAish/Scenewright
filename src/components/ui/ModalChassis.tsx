import { ReactNode } from "react";
import { IconButton } from "./Button";
import { CloseIcon } from "./icons";

export type ModalSize = "small" | "two-panel";

export interface ModalChassisProps {
  title: string;
  size: ModalSize;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * Modal shell: dimmed/blurred backdrop, header (italic display title +
 * close button), scrollable body, optional footer. Two size variants:
 * small, 620px (new campaign, monster/item finder) and two-panel, 860px
 * (NPC generation). Per the source frames: the finder's modal-dialog
 * carries no width override and falls back to the default 620px, unlike
 * NPC generation which sets width:860px explicitly.
 */
export function ModalChassis({ title, size, onClose, footer, children }: ModalChassisProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-modal-scrim backdrop-blur-[3px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        className={`relative flex flex-col bg-surface-card-solid border border-border-default rounded-md shadow-popover max-h-[680px] ${size === "two-panel" ? "w-[860px]" : "w-[620px]"}`}
      >
        <div className="flex items-center justify-between px-[22px] py-lg border-b border-border-default">
          <h2 className="font-display italic font-semibold text-display text-text-primary">{title}</h2>
          <IconButton label="Close" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </div>
        <div
          className={`flex-1 overflow-y-auto px-[22px] pt-lg pb-[20px] gap-base ${size === "two-panel" ? "flex flex-row items-start" : "flex flex-col"}`}
        >
          {children}
        </div>
        {footer && (
          <div className="px-[22px] py-[12px] border-t border-border-default bg-surface-panel">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
