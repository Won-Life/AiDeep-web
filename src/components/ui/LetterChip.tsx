/** 이름의 첫 글자를 색 사각형에 보여 주는 칩 — 워크스페이스·프로젝트 아이콘 공통(장식이라 스크린리더에서는 숨긴다) */
export default function LetterChip({
  text,
  fallback = '',
  size,
  radius = 10,
  fontSize = 12,
  background,
}: {
  text: string;
  /** text 가 비었을 때 대신 보여 줄 글자 */
  fallback?: string;
  size: number;
  radius?: number;
  fontSize?: number;
  /** CSS 색 값(토큰 변수 또는 프로젝트 색) */
  background: string;
}) {
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center font-semibold text-white"
      style={{ width: size, height: size, borderRadius: radius, fontSize, backgroundColor: background }}
    >
      {text.trim().charAt(0) || fallback}
    </span>
  );
}
