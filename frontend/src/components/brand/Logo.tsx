// Two bars of unequal length, one ink and one accent, sitting one above the other:
// debit over credit, meeting in balance. Deliberately only two shapes so the mark
// survives a 16px favicon — earlier four-element versions turned to mush.
export function LogoMark({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect width="24" height="24" rx="5.5" fill="var(--logo-ground, #18181b)" />
      <rect x="5" y="6.5" width="10" height="4" rx="2" fill="var(--logo-ink, #ffffff)" />
      <rect x="5" y="13.5" width="14" height="4" rx="2" fill="var(--logo-accent, #2dd4bf)" />
    </svg>
  );
}

export function Logo({
  size = 20,
  className = "",
  showWordmark = true,
}: {
  size?: number;
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark size={size} />
      {showWordmark && (
        <span className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--text)]">
          Ledger<span className="text-[var(--text-muted)]">Craft</span>
        </span>
      )}
    </span>
  );
}
