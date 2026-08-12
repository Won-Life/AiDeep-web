'use client';
import { useState } from 'react';
import { CHROME_EXTENSION_URL } from '@/lib/links';

interface DropDownProps {
  sidebarWidth: number;
  onChatOpen: () => void;
}

type ComingSoonFeature =
  | 'AI_SUMMARY'
  | 'AI_CHATBOT'
  | 'AI_AUTO_STRUCTURE'
  | 'WORD_DICTIONARY';

const FEATURE_LABELS: Record<ComingSoonFeature, string> = {
  AI_SUMMARY: 'AI 내용 요약',
  AI_CHATBOT: 'AI 챗봇',
  AI_AUTO_STRUCTURE: 'AI 자동 구조화',
  WORD_DICTIONARY: '단어 정의 사전',
};

/** 준비중 안내 + 익스텐션 다운로드 유도 모달 */
function ComingSoonModal({
  feature,
  onClose,
}: {
  feature: ComingSoonFeature;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={onClose}
    >
      <div
        className="w-[300px] rounded-[16px] bg-background border border-gray-700 p-5 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-[16px] font-bold text-foreground">
          {FEATURE_LABELS[feature]}
        </span>
        <p className="text-[14px] text-foreground leading-relaxed">
          준비 중인 기능이에요. 그동안 회의를 자동 구조화해주는 AiDeep for
          Google Meet을 먼저 만나보세요.
        </p>
        <div className="flex gap-2">
          <a
            href={CHROME_EXTENSION_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 h-[32px] items-center justify-center rounded-[8px] bg-main text-white text-[13px]"
          >
            크롬 익스텐션 다운로드
          </a>
          <button
            onClick={onClose}
            className="flex-1 h-[32px] rounded-[8px] bg-surface text-foreground text-[13px] border border-border"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

/** 3단화살표_하단: 12×8, 3개 수평선 겹침 */
function CollapseIcon({ flipped }: { flipped: boolean }) {
  return (
    <svg
      width="12"
      height="8"
      viewBox="0 0 12 8"
      fill="none"
      style={{ transform: flipped ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
    >
      <path d="M1 1.5L6 4.5L11 1.5" stroke="#CFCFCF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M1 4L6 7L11 4" stroke="#CFCFCF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** 준비 중 기능 상태 배지 — 사용 가능 여부 오해 방지 (#202) */
function ComingSoonBadge() {
  return (
    <span
      style={{
        marginLeft: 'auto',
        fontFamily: 'Pretendard, -apple-system, sans-serif',
        fontSize: 11,
        lineHeight: 1,
        color: 'rgb(var(--muted))',
        border: '1px solid rgb(var(--border))',
        borderRadius: 8,
        padding: '3px 6px',
        flexShrink: 0,
      }}
    >
      출시 예정
    </span>
  );
}

/** 아이콘 컨테이너: 20×20, radius 5px */
function Icon({ bg, opacity = 1, children }: { bg: string; opacity?: number; children: React.ReactNode }) {
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

export default function DropDown({ sidebarWidth, onChatOpen }: DropDownProps) {
  // 준비 중 기능 모음이라 기본 접힘 — 작동하는 편집 기능(캔버스·에디터)이 우선 노출 (#202)
  const [isOpen, setIsOpen] = useState(false);
  const [comingSoonFeature, setComingSoonFeature] =
    useState<ComingSoonFeature | null>(null);

  // onChatOpen: 챗봇 준비중 처리 이후 미사용. 패널 재활성화 시 openComingSoon 대신 연결.
  void onChatOpen;

  const openComingSoon = (feature: ComingSoonFeature) => {
    setComingSoonFeature(feature);
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        left: sidebarWidth + 16,
        zIndex: 30,
        // 항목 우측 "출시 예정" 배지가 들어갈 폭 (#202)
        width: 216,
      }}
    >
      {/* ── toolbox_top: 22px, #F5F5F5, 상단 radius 16px ── */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        style={{
          width: '100%',
          height: 22,
          background: 'rgb(var(--surface))',
          border: '1px solid rgb(var(--border))',
          borderRadius: isOpen ? '16px 16px 0 0' : 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          padding: 0,
          boxSizing: 'border-box',
        }}
      >
        <CollapseIcon flipped={!isOpen} />
      </button>

      {/* ── Aideep 도구 본문: white, 하단 radius 16px ── */}
      {isOpen && (
        <div
          style={{
            background: 'rgb(var(--background))',
            borderLeft: '1px solid rgb(var(--border))',
            borderRight: '1px solid rgb(var(--border))',
            borderBottom: '1px solid rgb(var(--border))',
            borderRadius: '0 0 16px 16px',
            padding: '17px 16px 16px 16px',
            boxSizing: 'border-box',
          }}
        >
          {/* 도구창: column, gap 16px */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* 제목: Pretendard Bold 16px, #2C2C2C */}
            <span
              style={{
                fontFamily: 'Pretendard, -apple-system, sans-serif',
                fontWeight: 700,
                fontSize: 17,
                color: 'rgb(var(--foreground))',
                lineHeight: 1,
              }}
            >
              AiDeep 도구
            </span>

            {/* 항목 목록: column, gap 12px */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* AI 내용 요약 — 준비중 (icon opacity 0.6, text muted, 출시 예정 배지) */}
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                onClick={() => openComingSoon('AI_SUMMARY')}
              >
                <Icon bg="#FED7D9" opacity={0.6}>
                  {/* 요약 아이콘: 텍스트 줄 3개 (8×8) */}
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <rect x="0.5" y="0.5" width="7" height="1" rx="0.5" fill="#2C2C2C" />
                    <rect x="0.5" y="3" width="7" height="1" rx="0.5" fill="#2C2C2C" />
                    <rect x="0.5" y="5.5" width="5" height="1" rx="0.5" fill="#2C2C2C" />
                  </svg>
                </Icon>
                <span style={{ fontFamily: 'Pretendard, -apple-system, sans-serif', fontSize: 15, color: 'rgb(var(--muted))' }}>
                  AI 내용 요약
                </span>
                <ComingSoonBadge />
              </div>

              {/* AI 챗봇 사용하기 — 준비중 (패널 열기는 onChatOpen으로 복원 가능) */}
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                onClick={() => openComingSoon('AI_CHATBOT')}
              >
                <Icon bg="#D0EEFB" opacity={0.6}>
                  {/* 챗봇 아이콘: 원형 (7×8) */}
                  <svg width="7" height="8" viewBox="0 0 7 8" fill="none">
                    <circle cx="3.5" cy="4" r="2.5" stroke="#2C2C2C" strokeWidth="1" />
                    <circle cx="3.5" cy="4" r="1" fill="#2C2C2C" />
                  </svg>
                </Icon>
                <span style={{ fontFamily: 'Pretendard, -apple-system, sans-serif', fontSize: 15, color: 'rgb(var(--muted))' }}>
                  AI 챗봇 사용하기
                </span>
                <ComingSoonBadge />
              </div>

              {/* AI 자동 구조화 — 준비중 (icon opacity 0.6, text #A0A0A0) */}
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                onClick={() => openComingSoon('AI_AUTO_STRUCTURE')}
              >
                <Icon bg="#FBF0BC" opacity={0.6}>
                  {/* 구조화 아이콘: git pull-request 스타일 (10×10) */}
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <circle cx="2" cy="2" r="1.5" stroke="#2C2C2C" strokeWidth="1" />
                    <circle cx="8" cy="2" r="1.5" stroke="#2C2C2C" strokeWidth="1" />
                    <circle cx="2" cy="8" r="1.5" stroke="#2C2C2C" strokeWidth="1" />
                    <line x1="2" y1="3.5" x2="2" y2="6.5" stroke="#2C2C2C" strokeWidth="1" />
                    <path d="M8 3.5 C8 5.5 2 5.5 2 6.5" stroke="#2C2C2C" strokeWidth="1" fill="none" />
                  </svg>
                </Icon>
                <span style={{ fontFamily: 'Pretendard, -apple-system, sans-serif', fontSize: 15, color: 'rgb(var(--muted))' }}>
                  AI 자동 구조화
                </span>
                <ComingSoonBadge />
              </div>

              {/* 단어 정의 사전 — 준비중 (icon opacity 0.6, text #A0A0A0) */}
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                onClick={() => openComingSoon('WORD_DICTIONARY')}
              >
                <Icon bg="#DFF8BF" opacity={0.6}>
                  {/* 단어사전 아이콘: W 형태 (10×7) */}
                  <svg width="10" height="7" viewBox="0 0 10 7" fill="none">
                    <path
                      d="M1 1L2.5 6L5 2.5L7.5 6L9 1"
                      stroke="#2C2C2C"
                      strokeWidth="1"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Icon>
                <span style={{ fontFamily: 'Pretendard, -apple-system, sans-serif', fontSize: 15, color: 'rgb(var(--muted))' }}>
                  단어 정의 사전
                </span>
                <ComingSoonBadge />
              </div>

            </div>
          </div>
        </div>
      )}

      {comingSoonFeature && (
        <ComingSoonModal
          feature={comingSoonFeature}
          onClose={() => setComingSoonFeature(null)}
        />
      )}
    </div>
  );
}
