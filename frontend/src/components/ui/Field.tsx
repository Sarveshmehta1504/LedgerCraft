import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

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

export function TextField({ label, error, hint, id, className = "", ...props }: TextFieldProps) {
  const fieldId = id ?? `field-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <FieldShell label={label} htmlFor={fieldId} error={error} hint={hint} required={props.required}>
      <input
        id={fieldId}
        aria-invalid={Boolean(error)}
        className={`${control} ${borderFor(error)} ${className}`}
        {...props}
      />
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
  ...props
}: SelectFieldProps) {
  const fieldId = id ?? `field-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <FieldShell label={label} htmlFor={fieldId} error={error} hint={hint} required={props.required}>
      <select
        id={fieldId}
        aria-invalid={Boolean(error)}
        className={`${control} ${borderFor(error)} cursor-pointer ${className}`}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}
