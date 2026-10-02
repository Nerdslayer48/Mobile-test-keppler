import type { InputHTMLAttributes } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  placeholder?: string;
}

export function Input({
  placeholder = "Search",
  className = "",
  type = "text",
  ...props
}: InputProps) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      className={`h-[40px] w-[240px] rounded-[10px] border border-input-border
        bg-input-bg pl-[20px] font-inder text-input-text
        placeholder:text-input-placeholder ${className}`}
      {...props}
    />
  );
}
