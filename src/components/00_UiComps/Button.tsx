import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "outline" | "danger" | "delete";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  fullWidth?: boolean;
  disableHover?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border-primary bg-primary font-montserrat text-text-primary hover:border-success-subtle hover:bg-success-subtle",
  secondary:
    "border-button-border bg-button-bg text-button-text hover:bg-button-hover",
  outline:
    "border-primary bg-transparent text-primary hover:bg-success-subtle",
  danger: "border-error bg-error text-background hover:opacity-90",
  delete: "border-button-red bg-button-red text-text-primary hover:opacity-90",
};

export function Button({
  children,
  variant = "primary",
  fullWidth = false,
  disableHover = false,
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  const fitContent = className.split(/\s+/).includes("w-fit");
  const appearance = disableHover
    ? variantClasses[variant].split(/\s+/).filter((name) => !name.startsWith("hover:")).join(" ")
    : variantClasses[variant];

  return (
    <button
      type={type}
      className={`inline-flex items-center
        justify-center rounded-[6px]
        border font-montserrat font-normal
        transition-colors duration-150
        focus-visible:outline-2 focus-visible:outline-offset-2
        focus-visible:outline-primary
        disabled:cursor-not-allowed
        disabled:opacity-50 py-[6px] ${fitContent ? "px-[6px]" : "px-[24px]"}
        text-[16px] ${appearance}
        ${fullWidth && !fitContent ? "w-full" : ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
