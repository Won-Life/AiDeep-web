'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

type Phase = 'input' | 'loading' | 'response';

interface AiChatPanelProps {
  onClose: () => void;
  sidebarWidth: number;
}

// 나중에 실제 파이프라인 API로 교체
async function fetchAiResponse(_question: string): Promise<string> {
  await new Promise((r) => setTimeout(r, 1200));
  return `여기까지 채우고 내려갑니다. 여기까지 채우고 내려갑니다. 여기까지 채우고 내려갑니다. 여기까지 채우고 내려갑니다. 여기까지 채우고 내려갑니다. 여기까지 채우고 내려갑니다. 여기까지 채우고 내려갑니다. 여기까지 채우고 내려갑니다. 여기까지 채우고 내려갑니다. 여기까지 채우고 내려갑니다. 여기까지 채우고 내려갑니다.`;
}

/** 피그마 "단어_icon": 20×20 frame, Hexagon 10×10 at (5,5) */
function AiIcon() {
  return (
    <div
      style={{
        width: 20,
        height: 20,
        borderRadius: '50%',
        border: '1.5px solid #A8C8E8',
        background: '#fff',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: '#A8C8E8',
        }}
      />
    </div>
  );
}

export default function AiChatPanel({ onClose, sidebarWidth }: AiChatPanelProps) {
  const [phase, setPhase] = useState<Phase>('input');
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // 닫힐 때 부모(layout)에서 언마운트되므로 열릴 때마다 state는 초기값으로 시작한다
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!question.trim() || phase !== 'input') return;
    setPhase('loading');
    try {
      const result = await fetchAiResponse(question.trim());
      setResponse(result);
      setPhase('response');
    } catch {
      setPhase('input');
    }
  }, [question, phase]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') handleSubmit();
      if (e.key === 'Escape') onClose();
    },
    [handleSubmit, onClose],
  );

  return (
    <>
      <style>{`
        @keyframes aiDot {
          0%, 60%, 100% { opacity: 0.25; }
          30% { opacity: 1; }
        }
      `}</style>

      <div
        style={{
          position: 'fixed',
          left: sidebarWidth + 40,
          top: '44%',
          transform: 'translateY(-50%)',
          zIndex: 40,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 8,
        }}
      >
        {/* ── 질문 pill ── */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            height: 31,
            padding: '0 12px',
            border: '1px solid #D9D9D9',
            borderRadius: 500,
            boxShadow: '0px 0px 4px rgba(0,0,0,0.25)',
            background: '#fff',
          }}
        >
          <span
            style={{
              fontFamily: 'Pretendard, -apple-system, sans-serif',
              fontSize: 16,
              color: '#2C2C2B',
              whiteSpace: 'pre',
              lineHeight: '31px',
            }}
          >
            {'>> '}
          </span>
          <input
            ref={inputRef}
            value={question}
            onChange={(e) => phase === 'input' && setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            readOnly={phase !== 'input'}
            placeholder="질문 내용"
            style={{
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontFamily: 'Pretendard, -apple-system, sans-serif',
              fontSize: 16,
              color: '#2C2C2B',
              lineHeight: '31px',
              width: Math.max(72, question.length * 9.5),
              minWidth: 72,
              maxWidth: 460,
            }}
          />
        </div>

        {/* ── 로딩 (피그마 답변 frame 52×32) ── */}
        {phase === 'loading' && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              height: 32,
              padding: '0 14px',
              gap: 10,
              background: '#fff',
              border: '1px solid #EBEBEB',
              borderRadius: 16,
              boxShadow: '0px 0px 4px rgba(0,0,0,0.25)',
            }}
          >
            <AiIcon />
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  style={{
                    display: 'block',
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: '#AAAAAA',
                    animation: 'aiDot 1.2s infinite',
                    animationDelay: `${i * 0.3}s`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── 답변 카드 (피그마 537×243, 아이콘 at 12,12 / 텍스트 at 48,12) ── */}
        {phase === 'response' && (
          <div
            style={{
              width: 537,
              background: '#fff',
              border: '1px solid #EBEBEB',
              borderRadius: 16,
              boxShadow: '0px 0px 4px rgba(0,0,0,0.25)',
              position: 'relative',
              boxSizing: 'border-box',
            }}
          >
            {/* 아이콘: (12,12) */}
            <div style={{ position: 'absolute', top: 12, left: 12 }}>
              <AiIcon />
            </div>
            {/* 텍스트: x=48 (=12+20+16), y=12 */}
            <p
              style={{
                margin: 0,
                paddingTop: 12,
                paddingRight: 16,
                paddingBottom: 16,
                paddingLeft: 48,
                fontFamily: 'Pretendard, -apple-system, sans-serif',
                fontSize: 16,
                color: '#2C2C2B',
                lineHeight: 1.75,
                wordBreak: 'break-word',
              }}
            >
              {response}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
