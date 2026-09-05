"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { Select } from "./Select";

const control =
  "h-9 w-full rounded-md border bg-white px-2.5 text-sm text-[var(--text)] " +
  "transition-colors duration-150 placeholder:text-[var(--text-subtle)] " +
  "focus:outline-2 focus:outline-offset-[-1px] focus:outline-[var(--accent)] " +
  "disabled:bg-[var(--surface-raised)] disabled:text-[var(--text-muted)]";

function borderFor(error?: string) {
  return error ? "border-[var(--danger)]" : "border-[var(--line-strong)]";
}

interface FieldShellProps {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}

/** Label above control, error below it — the form pattern used on every screen. */
export function FieldShell({ label, htmlFor, error, hint, required, children }: FieldShellProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-[var(--text-muted)]">
        {label}
        {required && <span className="ml-0.5 text-[var(--danger)]">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-[var(--danger)]">{error}</p>
      ) : hint ? (
        <p className="text-xs text-[var(--text-subtle)]">{hint}</p>
      ) : null}
    </div>
  );
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export function TextField({ label, error, hint, id, className = "", type, ...props }: TextFieldProps) {
  const fieldId = id ?? `field-${label.toLowerCase().replace(/\s+/g, "-")}`;
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";

  return (
    <FieldShell label={label} htmlFor={fieldId} error={error} hint={hint} required={props.required}>
      <div className="relative">
        <input
          id={fieldId}
          aria-invalid={Boolean(error)}
          type={isPassword ? (revealed ? "text" : "password") : type}
          className={`${control} ${borderFor(error)} ${isPassword ? "pr-9" : ""} ${className}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((value) => !value)}
            aria-label={revealed ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-[var(--text-subtle)] transition-colors duration-150 hover:text-[var(--text)]"
          >
            {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    </FieldShell>
  );
}

/**
 * A saved value on a locked document. Keeps the label rhythm of the editable
 * fields but renders text — a disabled input still invites a click that does
 * nothing.
 */
export function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <FieldShell label={label}>
      <p className="flex h-9 items-center text-sm text-[var(--text)]">{value || "—"}</p>
    </FieldShell>
  );
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  hint?: string;
  options: { value: string | number; label: string }[];
  placeholder?: string;
}

export function SelectField({
  label,
  error,
  hint,
  options,
  placeholder,
  id,
  className = "",
  value,
  onChange,
  disabled,
  required,
}: SelectFieldProps) {
  const fieldId = id ?? `field-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <FieldShell label={label} htmlFor={fieldId} error={error} hint={hint} required={required}>
      <Select
        id={fieldId}
        value={value as string | number}
        onChange={(event) => onChange?.(event as React.ChangeEvent<HTMLSelectElement>)}
        options={options}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        error={error}
        className={className}
      />
    </FieldShell>
  );
}
