'use client';
export default function Switch({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-[31px] w-[59px] shrink-0 rounded-full border-2 border-[var(--onnode-primary)] shadow-inner focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 ${checked ? 'bg-[var(--onnode-primary)]' : 'bg-[var(--onnode-primary-200)]'}`}
    >
      <span
        className={`absolute top-[3px] size-[21px] rounded-full bg-[var(--onnode-neutral-white)] ${checked ? 'right-[3px]' : 'left-[3px]'}`}
      />
    </button>
  );
}
