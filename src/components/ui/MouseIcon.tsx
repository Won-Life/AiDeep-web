'use client';

/**
 * 마우스 클릭 동작 아이콘 — 사용법 안내용.
 * right: 오른쪽 버튼이 main 컬러로 눌린 상태
 * double: 왼쪽 버튼이 눌린 상태 + 좌상단 클릭 스파크 2개(두 번 클릭 암시)
 */
export default function MouseIcon({
  button,
}: {
  button: 'right' | 'double';
}) {
  return (
    <svg
      width="15"
      height="19"
      viewBox="0 0 16 20"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      {button === 'double' && (
        <>
          <path
            d="M3.4 2.8 L1.6 1"
            stroke="rgb(var(--ds-main))"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <path
            d="M6.2 1.9 L5.7 0.4"
            stroke="rgb(var(--ds-main))"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </>
      )}
      {/* 눌린 버튼 하이라이트 (상단 절반의 좌/우 사분면) */}
      {button === 'right' ? (
        <path
          d="M8 4.6 H9 C11.5 4.6 13.4 6.6 13.4 9 V10.4 H8 Z"
          fill="rgb(var(--ds-main))"
        />
      ) : (
        <path
          d="M8 4.6 H7 C4.5 4.6 2.6 6.6 2.6 9 V10.4 H8 Z"
          fill="rgb(var(--ds-main))"
        />
      )}
      {/* 본체 */}
      <rect
        x="2"
        y="4"
        width="12"
        height="15.4"
        rx="6"
        stroke="rgb(var(--muted))"
        strokeWidth="1.3"
      />
      <path d="M8 4 V11" stroke="rgb(var(--muted))" strokeWidth="1.3" />
      <path d="M2 11 H14" stroke="rgb(var(--muted))" strokeWidth="1.3" />
    </svg>
  );
}

/** 연결점 끌기 아이콘 — 연결점(작은 원)에서 점선이 뻗어나가는 모양 */
export function ConnectDragIcon() {
  return (
    <svg
      width="17"
      height="10"
      viewBox="0 0 17 10"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <circle cx="4" cy="5" r="3" fill="#2C2C2C" />
      <path
        d="M8 5 H16"
        stroke="rgb(var(--ds-main))"
        strokeWidth="1.4"
        strokeDasharray="2.5 2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
