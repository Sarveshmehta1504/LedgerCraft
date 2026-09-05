import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const base =
  "inline-flex items-center justify-center gap-1.5 rounded-md border font-medium " +
  "transition-colors duration-150 cursor-pointer select-none " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] " +
  "disabled:cursor-not-allowed disabled:opacity-45 active:translate-y-[0.5px]";

const variants: Record<Variant, string> = {
  primary:
    "border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800 hover:border-zinc-800",
  secondary:
    "border-[var(--line-strong)] bg-white text-[var(--text)] hover:bg-[var(--surface-raised)]",
  ghost:
    "border-transparent bg-transparent text-[var(--text-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]",
  danger:
    "border-transparent bg-[var(--danger-wash)] text-[var(--danger)] hover:bg-red-100",
};

const sizes: Record<Size, string> = {
  sm: "h-7 px-2.5 text-[13px]",
  md: "h-9 px-3.5 text-sm",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
}
