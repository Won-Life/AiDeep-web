'use client';
import { useState } from 'react';

interface DropDownProps {
  sidebarWidth: number;
  onChatOpen: () => void;
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
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        left: sidebarWidth + 16,
        zIndex: 30,
        width: 173,
      }}
    >
      {/* ── toolbox_top: 22px, #F5F5F5, 상단 radius 16px ── */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        style={{
          width: '100%',
          height: 22,
          background: '#F5F5F5',
          border: '1px solid #CFCFCF',
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
            background: '#FFFFFF',
            borderLeft: '1px solid #CFCFCF',
            borderRight: '1px solid #CFCFCF',
            borderBottom: '1px solid #CFCFCF',
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
                color: '#2C2C2C',
                lineHeight: 1,
              }}
            >
              AIDeep 도구
            </span>

            {/* 항목 목록: column, gap 12px */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* AI 내용 요약 — 활성 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <Icon bg="#FED7D9">
                  {/* 요약 아이콘: 텍스트 줄 3개 (8×8) */}
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <rect x="0.5" y="0.5" width="7" height="1" rx="0.5" fill="#2C2C2C" />
                    <rect x="0.5" y="3" width="7" height="1" rx="0.5" fill="#2C2C2C" />
                    <rect x="0.5" y="5.5" width="5" height="1" rx="0.5" fill="#2C2C2C" />
                  </svg>
                </Icon>
                <span style={{ fontFamily: 'Pretendard, -apple-system, sans-serif', fontSize: 15, color: '#2C2C2C' }}>
                  AI 내용 요약
                </span>
              </div>

              {/* AI 챗봇 사용하기 — 활성 */}
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                onClick={() => { setIsOpen(false); onChatOpen(); }}
              >
                <Icon bg="#D0EEFB">
                  {/* 챗봇 아이콘: 원형 (7×8) */}
                  <svg width="7" height="8" viewBox="0 0 7 8" fill="none">
                    <circle cx="3.5" cy="4" r="2.5" stroke="#2C2C2C" strokeWidth="1" />
                    <circle cx="3.5" cy="4" r="1" fill="#2C2C2C" />
                  </svg>
                </Icon>
                <span style={{ fontFamily: 'Pretendard, -apple-system, sans-serif', fontSize: 15, color: '#2C2C2C' }}>
                  AI 챗봇 사용하기
                </span>
              </div>

              {/* AI 자동 구조화 — 비활성 (icon opacity 0.6, text #A0A0A0) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                <span style={{ fontFamily: 'Pretendard, -apple-system, sans-serif', fontSize: 15, color: '#A0A0A0' }}>
                  AI 자동 구조화
                </span>
              </div>

              {/* 단어 정의 사전 — 비활성 (icon opacity 0.6, text #A0A0A0) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                <span style={{ fontFamily: 'Pretendard, -apple-system, sans-serif', fontSize: 15, color: '#A0A0A0' }}>
                  단어 정의 사전
                </span>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
