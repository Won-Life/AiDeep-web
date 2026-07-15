'use client';
import { useState, useEffect, useRef } from 'react';
import { useReactFlow, useViewport } from '@xyflow/react';

const ZOOM_OPTIONS = [
  { label: '25%', value: 0.25 },
  { label: '50%', value: 0.5 },
  { label: '75%', value: 0.75 },
  { label: '100%', value: 1 },
  { label: '화면에 맞게 확대/축소', value: null },
];

export default function ZoomControl() {
  const { zoomTo, fitView } = useReactFlow();
  const { zoom } = useViewport();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const displayZoom = `${Math.round(zoom * 100)}%`;

  const handleSelect = (value: number | null) => {
    if (value === null) {
      fitView({ duration: 300 });
    } else {
      zoomTo(value, { duration: 300 });
    }
    setIsOpen(false);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="absolute bottom-4 right-4 z-40">
      {isOpen && (
        <div className="absolute bottom-9 right-0 w-[153px] rounded-xl border border-gray-700 bg-background py-3">
          <p className="mb-2 px-4 text-base font-bold text-foreground">화면 비율</p>
          <ul>
            {ZOOM_OPTIONS.map((opt) => {
              const isActive =
                opt.value !== null && Math.abs(zoom - opt.value) < 0.01;
              return (
                <li key={opt.label}>
                  <button
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full px-4 py-1.5 text-left text-sm text-foreground hover:bg-surface ${
                      isActive ? 'bg-surface font-semibold' : ''
                    }`}
                  >
                    {opt.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center gap-1 rounded-[5px] bg-surface px-2 py-1.5 text-sm text-foreground"
      >
        <span>{displayZoom}</span>
        <svg
          width="10"
          height="6"
          viewBox="0 0 10 6"
          fill="none"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
        >
          <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
