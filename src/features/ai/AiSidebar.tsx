'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { chatWithAi } from '@/api/ai';

export const AI_SIDEBAR_WIDTH = 320;
export const AI_SIDEBAR_VISIBLE_WIDTH = 40;

type Phase = 'input' | 'loading' | 'response';

interface AiSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  workspaceId: string | null;
}

/** AI 아이콘: 20×20 원형 */
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
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#A8C8E8' }} />
    </div>
  );
}

/** 아이콘 컨테이너: 20×20, radius 5px */
function ToolIcon({ bg, opacity = 1, children }: { bg: string; opacity?: number; children: React.ReactNode }) {
  return (
    <div
      style={{
        width: 20,
        height: 20,
        background: bg,
        borderRadius: 5,
        opacity,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  );
}

export default function AiSidebar({ isOpen, onToggle, workspaceId }: AiSidebarProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('input');
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isChatOpen && isOpen) {
      setPhase('input');
      setQuestion('');
      setResponse('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isChatOpen, isOpen]);

  const handleSubmit = useCallback(async () => {
    if (!question.trim() || phase !== 'input' || !workspaceId) return;
    setPhase('loading');
    try {
      const result = await chatWithAi(workspaceId, { query: question.trim() });
      setResponse(result.answer);
      setPhase('response');
    } catch {
      setPhase('input');
    }
  }, [question, phase, workspaceId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') handleSubmit();
    },
    [handleSubmit],
  );

  return (
    <>
      <style>{`
        @keyframes aiDot {
          0%, 60%, 100% { opacity: 0.25; }
          30% { opacity: 1; }
        }
      `}</style>

      <aside
        style={{
          position: 'fixed',
          right: 0,
          top: 0,
          height: '100%',
          width: AI_SIDEBAR_WIDTH,
          background: 'rgb(var(--surface))',
          borderLeft: '1px solid rgb(var(--border))',
          transform: isOpen
            ? 'translateX(0)'
            : `translateX(calc(100% - ${AI_SIDEBAR_VISIBLE_WIDTH}px))`,
          transition: 'transform 300ms ease',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* ── 토글 탭 (항상 보임) ── */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: AI_SIDEBAR_VISIBLE_WIDTH,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            borderRight: isOpen ? '1px solid rgb(var(--border))' : 'none',
          }}
          onClick={onToggle}
        >
          <span style={{ fontSize: 16, color: 'rgb(var(--ds-gray-500))', fontWeight: 600 }}>
            {isOpen ? '»' : '«'}
          </span>
        </div>

        {/* ── 사이드바 본문 (isOpen 시 표시) ── */}
        {isOpen && (
          <div
            style={{
              marginLeft: AI_SIDEBAR_VISIBLE_WIDTH,
              flex: 1,
              overflowY: 'auto',
              padding: '20px 16px 16px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            {/* 제목 */}
            <span
              style={{
                fontFamily: 'Pretendard, -apple-system, sans-serif',
                fontWeight: 700,
                fontSize: 16,
                color: '#2C2C2C',
              }}
            >
              AIDeep 도구
            </span>

            {/* 도구 목록 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* AI 내용 요약 — 활성 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <ToolIcon bg="#FED7D9">
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <rect x="0.5" y="0.5" width="7" height="1" rx="0.5" fill="#2C2C2C" />
                    <rect x="0.5" y="3" width="7" height="1" rx="0.5" fill="#2C2C2C" />
                    <rect x="0.5" y="5.5" width="5" height="1" rx="0.5" fill="#2C2C2C" />
                  </svg>
                </ToolIcon>
                <span style={{ fontFamily: 'Pretendard, -apple-system, sans-serif', fontSize: 14, color: '#2C2C2C' }}>
                  AI 내용 요약
                </span>
              </div>

              {/* AI 챗봇 — 활성, 토글 */}
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                onClick={() => setIsChatOpen((v) => !v)}
              >
                <ToolIcon bg="#D0EEFB">
                  <svg width="7" height="8" viewBox="0 0 7 8" fill="none">
                    <circle cx="3.5" cy="4" r="2.5" stroke="#2C2C2C" strokeWidth="1" />
                    <circle cx="3.5" cy="4" r="1" fill="#2C2C2C" />
                  </svg>
                </ToolIcon>
                <span style={{ fontFamily: 'Pretendard, -apple-system, sans-serif', fontSize: 14, color: '#2C2C2C' }}>
                  AI 챗봇 사용하기
                </span>
                <span style={{ fontSize: 12, color: 'rgb(var(--ds-gray-500))', marginLeft: 'auto' }}>
                  {isChatOpen ? '▲' : '▼'}
                </span>
              </div>

              {/* AI 자동 구조화 — 비활성 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ToolIcon bg="#FBF0BC" opacity={0.6}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <circle cx="2" cy="2" r="1.5" stroke="#2C2C2C" strokeWidth="1" />
                    <circle cx="8" cy="2" r="1.5" stroke="#2C2C2C" strokeWidth="1" />
                    <circle cx="2" cy="8" r="1.5" stroke="#2C2C2C" strokeWidth="1" />
                    <line x1="2" y1="3.5" x2="2" y2="6.5" stroke="#2C2C2C" strokeWidth="1" />
                    <path d="M8 3.5 C8 5.5 2 5.5 2 6.5" stroke="#2C2C2C" strokeWidth="1" fill="none" />
                  </svg>
                </ToolIcon>
                <span style={{ fontFamily: 'Pretendard, -apple-system, sans-serif', fontSize: 14, color: '#A0A0A0' }}>
                  AI 자동 구조화
                </span>
              </div>

              {/* 단어 정의 사전 — 비활성 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ToolIcon bg="#DFF8BF" opacity={0.6}>
                  <svg width="10" height="7" viewBox="0 0 10 7" fill="none">
                    <path
                      d="M1 1L2.5 6L5 2.5L7.5 6L9 1"
                      stroke="#2C2C2C"
                      strokeWidth="1"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </ToolIcon>
                <span style={{ fontFamily: 'Pretendard, -apple-system, sans-serif', fontSize: 14, color: '#A0A0A0' }}>
                  단어 정의 사전
                </span>
              </div>
            </div>

            {/* ── 챗봇 영역 (isChatOpen 시 표시) ── */}
            {isChatOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                {/* 구분선 */}
                <div style={{ height: 1, background: 'rgb(var(--border))' }} />

                {/* 질문 pill */}
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
                      width: '100%',
                      minWidth: 72,
                    }}
                  />
                </div>

                {/* 로딩 */}
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

                {/* 답변 카드 */}
                {phase === 'response' && (
                  <div
                    style={{
                      background: '#fff',
                      border: '1px solid #EBEBEB',
                      borderRadius: 16,
                      boxShadow: '0px 0px 4px rgba(0,0,0,0.25)',
                      position: 'relative',
                      boxSizing: 'border-box',
                    }}
                  >
                    <div style={{ position: 'absolute', top: 12, left: 12 }}>
                      <AiIcon />
                    </div>
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
            )}
          </div>
        )}
      </aside>
    </>
  );
}
