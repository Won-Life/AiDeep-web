'use client';
export default function Toast({
  message,
  className = '',
}: {
  message: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-[18px] right-[18px] z-50 max-w-[calc(100vw-36px)] rounded-[25px] bg-[var(--onnode-primary-600)] px-7 py-3 text-[12px] text-[var(--onnode-neutral-white)] shadow-md ${className}`}
    >
      <span aria-hidden="true" className="mr-2">
        ✓
      </span>
      {message}
    </div>
  );
}
