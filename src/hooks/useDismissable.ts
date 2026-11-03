import { useEffect, type RefObject } from 'react';

interface Options {
  open: boolean;
  onClose: () => void;
  /** 주면 이 요소 밖의 mousedown 으로도 닫는다(트리거를 포함하는 래퍼를 넘길 것) */
  rootRef?: RefObject<HTMLElement | null>;
  /** 주면 Esc 로 닫은 뒤 이 요소로 포커스를 돌려준다 */
  restoreFocusRef?: RefObject<HTMLElement | null>;
}

/**
 * 열려 있는 동안만 Esc(포커스 위치와 무관)와 바깥 클릭으로 팝업을 닫는다.
 * Esc 는 capture 단계에서 가로채 아래에 깔린 모달·캔버스로 넘기지 않는다.
 */
export function useDismissable({ open, onClose, rootRef, restoreFocusRef }: Options) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      onClose();
      restoreFocusRef?.current?.focus();
    };
    const onPointer = (event: MouseEvent) => {
      if (!rootRef?.current?.contains(event.target as Node)) onClose();
    };
    document.addEventListener('keydown', onKey, true);
    if (rootRef) document.addEventListener('mousedown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('mousedown', onPointer);
    };
  }, [open, onClose, rootRef, restoreFocusRef]);
}
