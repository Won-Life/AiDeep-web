'use client';

import { useEffect, useState } from 'react';
import FestivalAnswerCard from '@/features/festival/FestivalAnswerCard';
import { decodeAnswer, parseShareHash } from '@/features/festival/share/answerLink';

interface ShareContent {
  content?: string;
  createdAt: Date;
}

/**
 * 인스타 DM으로 받은 공유 링크가 열리는 페이지.
 * 답변 본문과 생성일은 경로가 아니라 URL 해시에 담겨 있어 서버로 전송되지 않는다.
 */
export default function FestivalSharePage() {
  const [share, setShare] = useState<ShareContent | null>(null);

  useEffect(() => {
    let cancelled = false;
    const { createdAt, payload } = parseShareHash(window.location.hash);
    void decodeAnswer(payload).then((decoded) => {
      if (cancelled) return;
      // 날짜가 유실된 옛 링크는 오늘 날짜로 떨어진다 — 카드가 비는 것보다 낫다.
      setShare({ content: decoded ?? undefined, createdAt: createdAt ?? new Date() });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        background: '#06336E',
      }}
    >
      <div style={{ width: '100%', maxWidth: 540 }}>
        {share && (
          <FestivalAnswerCard content={share.content} exportedAt={share.createdAt} variant="page" />
        )}
      </div>
    </main>
  );
}
