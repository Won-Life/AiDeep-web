import { useEffect, useRef } from 'react';

/**
 * ⌘K 검색 포커스 · ⌘\ 접기/펼치기, 그리고 접힘 상태에서 검색으로 펼친 직후의 검색창 포커스.
 *
 * e.key가 아니라 e.code(물리 키 위치) 비교인 이유: 한글 자판에서는 K 자리의
 * e.key가 'ㅏ'로 들어와 'k' 비교가 실패한다. IME 조합 중에는 'Process'가 되기도 함.
 */
export function useSidebarShortcuts({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const pendingSearchFocusRef = useRef(false);

  const expandToSearch = () => {
    pendingSearchFocusRef.current = true;
    onToggle();
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.code === 'KeyK') {
        e.preventDefault();
        if (!isOpen) {
          pendingSearchFocusRef.current = true;
          onToggle();
        } else {
          searchInputRef.current?.focus();
        }
      } else if (e.code === 'Backslash') {
        e.preventDefault();
        onToggle();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onToggle]);

  useEffect(() => {
    if (isOpen && pendingSearchFocusRef.current) {
      pendingSearchFocusRef.current = false;
      searchInputRef.current?.focus();
    }
  }, [isOpen]);

  return { searchInputRef, expandToSearch };
}
