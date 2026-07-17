'use client';

import { cloneElement, isValidElement, useId, useState, type ReactElement, type ReactNode } from 'react';

interface TooltipProps {
  label: string;
  shortcut?: string;
  children: ReactNode;
  // 트리거가 화면 오른쪽 끝에 붙어있어 가운데 정렬 시 잘리는 경우 'end' 사용
  align?: 'center' | 'end';
}

export function Tooltip({ label, shortcut, children, align = 'center' }: TooltipProps) {
  const [show, setShow] = useState(false);
  const tooltipId = useId();

  // aria-describedby는 "설명"일 뿐 접근성 이름이 아니다 — 아이콘 전용 트리거가 title을
  // 잃고 스크린리더에 이름 없이 노출되지 않도록 aria-label도 함께 주입한다.
  const trigger = isValidElement(children)
    ? cloneElement(
        children as ReactElement<{ 'aria-describedby'?: string; 'aria-label'?: string }>,
        { 'aria-describedby': tooltipId, 'aria-label': label },
      )
    : children;

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      {trigger}
      {show && (
        <div
          id={tooltipId}
          role="tooltip"
          className={`absolute top-full mt-1.5 z-[9999] pointer-events-none whitespace-nowrap rounded-md px-2 py-1 ${
            align === 'end' ? 'right-0' : 'left-1/2 -translate-x-1/2'
          }`}
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
