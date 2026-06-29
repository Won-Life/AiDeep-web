/*
 * CONTEXT
 * - Problem      : 워크스페이스 초대 링크를 클릭 한 번으로 생성하고 클립보드에 복사해야 함.
 * - Why          : inviteToWorkspace API가 이미 { url, code }를 반환하므로 두 값을 함께 복사.
 *                  별도 모달 없이 즉각적인 클립보드 복사 + 토스트가 UX를 단순하게 유지.
 * - Alternatives : 링크를 미리 생성해 저장 — 만료 관리 복잡, 보안 리스크.
 * - Trade-offs   : 버튼 클릭마다 새 초대 코드를 발급함. 서버에서 중복 발급을 처리해야 함.
 * - Edge Case    : workspaceId가 없거나(null) API 실패 시 에러 토스트 표시.
 *                  clipboard API 미지원 브라우저는 콘솔 경고.
 */
'use client';
import { useState } from 'react';
import { inviteToWorkspace } from '@/api/workspace';

interface ShareButtonProps {
  workspaceId: string | null | undefined;
}

export default function ShareButton({ workspaceId }: ShareButtonProps) {
  const [toast, setToast] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  }

  async function handleShare() {
    if (!workspaceId || isLoading) return;
    setIsLoading(true);
    try {
      const { url, code } = await inviteToWorkspace({ workspaceId, role: 'EDITOR' });
      const clipboardText = `초대 URL: ${url}\n인증번호: ${code}`;
      try {
        await navigator.clipboard.writeText(clipboardText);
        showToast('초대 URL과 인증번호가 복사되었습니다.');
      } catch {
        console.warn('[ShareButton] clipboard write failed');
        showToast('초대 URL과 인증번호가 생성되었습니다.');
      }
    } catch {
      showToast('링크 생성에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleShare}
        disabled={isLoading || !workspaceId}
        className="flex items-center justify-center bg-main hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          borderRadius: 6,
          paddingLeft: 14,
          paddingRight: 14,
          height: 32,
          fontFamily: 'Pretendard, sans-serif',
          fontSize: 12,
          fontWeight: 700,
          color: '#ffffff',
          whiteSpace: 'nowrap',
        }}
      >
        {isLoading ? '생성 중...' : '공유하기'}
      </button>

      {toast && (
        <div
          className="absolute right-0 whitespace-nowrap rounded-md opacity-70 px-8 py-1.5"
          style={{
            top: 'calc(100% + 8px)',
            backgroundColor: 'rgb(var(--ds-gray-900))',
            color: 'rgb(var(--ds-gray-200))',
            fontFamily: 'Pretendard, sans-serif',
            fontSize: 12,
            lineHeight: '20px',
            // padding: '6px 12px',
            zIndex: 100,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
