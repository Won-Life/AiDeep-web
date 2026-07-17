'use client';

import { useState, type ReactNode } from 'react';

interface TooltipProps {
  label: string;
  shortcut?: string;
  children: ReactNode;
}

export function Tooltip({ label, shortcut, children }: TooltipProps) {
  const [show, setShow] = useState(false);

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-[9999] pointer-events-none whitespace-nowrap rounded-md px-2 py-1"
          style={{
            background: 'rgb(var(--background))',
            border: '1px solid rgb(var(--border))',
            boxShadow: '0 4px 16px rgba(0,0,0,0.09)',
            fontSize: 11,
            color: 'rgb(var(--foreground))',
          }}
        >
          {label}
          {shortcut && (
            <span className="ml-1.5" style={{ color: 'rgb(var(--muted))' }}>
              {shortcut}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
