'use client';

/*
 * CONTEXT
 * - Problem      : 일시적 세션 조회 실패 뒤 로그인 폼을 보여주면 세션이 끊긴 것으로 오인한다.
 * - Why          : 기존 인증 정보를 보존한 채 명시적으로 조회를 재시도할 수 있게 한다.
 * - Alternatives : 자동 무한 재시도 → 서버 장애 때 요청 반복과 무기한 대기를 만든다.
 * - Trade-offs   : 오류가 지속되면 사용자가 재시도를 선택한다.
 * - Edge Case    : 로그인 진입, 루트 진입, 워크스페이스의 부팅 중 네트워크 장애.
 */
export default function SessionLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center text-foreground" role="alert">
      <div>
        <p>로그인 정보를 불러오지 못했어요. 잠시 후 다시 시도해주세요.</p>
        <button type="button" onClick={onRetry} className="mt-4 rounded-lg border border-border px-4 py-2 hover:bg-surface">
          다시 시도
        </button>
      </div>
    </div>
  );
}
