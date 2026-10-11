'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/*
 * CONTEXT
 * - Problem      : 빈 캔버스 우클릭이 즉시 노드를 만들어 위치·화면 배율을 선택할 수 없다.
 * - Why          : 화면 좌표에 메뉴를 띄우고 생성 위치는 별도 flow 좌표로 호출부에서 보존한다.
 * - Alternatives : 캔버스 안에 두면 확대 배율에 따라 메뉴 크기도 달라진다.
 * - Trade-offs   : 포털 메뉴는 캔버스 배율과 독립적인 고정 크기를 갖는다.
 * - Edge Case    : 화면 가장자리에서 위치를 보정하고 바깥 클릭·Escape로 닫는다.
 */
export function CanvasContextMenu({ x, y, onClose, onCreate, onFit, onReset }: {
  x: number; y: number; onClose: () => void;
  onCreate: () => void; onFit: () => void; onReset: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose();
    };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', escape);
    };
  }, [onClose]);
  return createPortal(
    <div ref={ref} role="menu" aria-label="캔버스 메뉴"
      className="fixed z-[200] w-[180px] rounded-[22px] border border-[#7889FF] bg-white text-[#292929] shadow-[0_2px_3px_rgba(53,62,112,0.22)]"
      style={{ left: Math.max(8, Math.min(x + 10, window.innerWidth - 188)), top: Math.max(8, Math.min(y, window.innerHeight - 122)) }}
      onContextMenu={(event) => event.preventDefault()}>
      <span aria-hidden="true" className="absolute -left-[17px] top-0 size-3 rounded-full border-2 border-[#C6D1FF] bg-[#3F62E0]" />
      <div className="overflow-hidden rounded-[21px]">
        {[
          ['여기에 프로젝트 노드 추가', onCreate],
          ['화면에 맞추기', onFit],
          ['100%로 보기', onReset],
        ].map(([label, action]) => (
          <button key={label as string} type="button" role="menuitem"
            className="block h-[37px] w-full border-b border-[#C6D1FF] text-center text-[11px] last:border-b-0 hover:bg-[#E6EBFF] focus-visible:bg-[#E6EBFF] focus-visible:outline-none"
            onClick={() => { onClose(); (action as () => void)(); }}>{label as string}</button>
        ))}
      </div>
    </div>, document.body,
  );
}
