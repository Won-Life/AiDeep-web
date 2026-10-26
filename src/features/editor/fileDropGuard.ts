type FileDragEvent = {
  dataTransfer: { types: readonly string[]; dropEffect: string } | null;
  preventDefault: () => void;
  stopPropagation: () => void;
};

/*
 * CONTEXT
 * - Problem      : Lexical은 편집 잠금 시 native drag/drop을 명령으로 전달하지 않는다.
 * - Why          : native capture 단계에서 파일 기본 열기와 상위 캔버스 drop을 함께 차단한다.
 * - Alternatives : DROP_COMMAND 내부 검사만으로는 잠금 시 도달하지 않는 경로를 보호할 수 없다.
 * - Trade-offs   : 편집 가능 본문과 일반 텍스트 드래그는 기존 처리에 그대로 맡긴다.
 * - Edge Case    : 드래그 중 잠금 상태가 바뀌어도 이벤트 시점의 편집 가능 여부를 사용한다.
 */
export function blockLockedFileDrop(event: FileDragEvent, editable: boolean): boolean {
  if (editable || !event.dataTransfer?.types.includes('Files')) return false;
  event.preventDefault();
  event.stopPropagation();
  event.dataTransfer.dropEffect = 'none';
  return true;
}
