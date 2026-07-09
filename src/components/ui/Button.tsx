import { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "destructive";
export type ButtonSize = "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-[10px] py-[5px] text-ui",
  md: "px-[14px] py-[7px] text-ui",
};

const variantClasses: Record<ButtonVariant, string> = {
  // Filled accent button. Source: "New campaign" / "New scene" / "Generate" buttons.
  primary:
    "bg-accent text-white border border-accent hover:bg-accent-hover hover:border-accent-hover",
  // Outline button. Source: Button.jsx variant="neutral", used for Replace/Remove/Upload/Add Link.
  secondary:
    "bg-surface-card-solid text-text-button border border-border-soft hover:bg-surface-panel",
  // Outline destructive button. Source: Button.jsx variant="danger".
  destructive:
    "bg-surface-card-solid text-danger-text border border-danger-border hover:bg-danger-bg-hover",
};

export function Button({
  variant = "secondary",
  size = "md",
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-[6px] rounded-sm font-ui font-medium leading-tight cursor-pointer transition-colors duration-150 ${sizeClasses[size]} ${variantClasses[variant]} ${className ?? ""}`}
    >
      {children}
    </button>
  );
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
}

/** Square icon-only button. Source: modal header close button (26x26, radius-sm). */
export function IconButton({ label, className, children, ...rest }: IconButtonProps) {
  return (
    <button
      {...rest}
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center w-[26px] h-[26px] rounded-sm text-text-secondary hover:bg-surface-panel cursor-pointer transition-colors duration-150 ${className ?? ""}`}
    >
      {children}
    </button>
  );
}
