'use client';

import { useState } from 'react';
import { buildAnswerShareUrl } from '@/features/festival/share/answerLink';

export type ShareLinkState = 'idle' | 'working' | 'copied' | 'error';

/** 복사 완료 문구를 보여준 뒤 메뉴를 닫기까지의 시간. */
export const COPIED_DISPLAY_MS = 1200;

/**
 * 답변 하나에 대한 공유 링크를 만들어 클립보드에 넣는다.
 * 링크가 가리키는 페이지는 `/festival/[id]`이고, 답변은 URL 해시에 실려 서버로 가지 않는다.
 */
export function useAnswerShareLink() {
  const [state, setState] = useState<ShareLinkState>('idle');

  const copyLink = async (content: string, createdAt: Date) => {
    setState('working');
    try {
      const url = await buildAnswerShareUrl(content, window.location.origin, createdAt);
      await navigator.clipboard.writeText(url);
      setState('copied');
      return true;
    } catch (error) {
      console.error('[chat] 답변 공유 링크 복사 실패', error);
      setState('error');
      return false;
    }
  };

  const resetState = () => setState('idle');

  return { state, copyLink, resetState };
}
