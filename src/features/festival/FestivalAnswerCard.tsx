'use client';

/*
 * CONTEXT
 * - Problem      : 같은 축제 카드가 두 곳에 쓰인다. (1) 우클릭 PNG 내보내기 — 캡처가 픽셀
 *                  단위로 결정돼야 하므로 폭이 540px로 고정돼야 한다. (2) 공유 링크 페이지 —
 *                  인스타 DM으로 열리는 모바일 인앱 브라우저라 폭이 유동이어야 한다.
 * - Why          : 시각 요소는 한 컴포넌트에 두고 `variant`로 치수 정책만 가른다. 카드를 두 벌
 *                  만들면 문구를 고칠 때마다 두 곳을 고쳐야 하고 반드시 어긋난다.
 * - Alternatives : (1) 카드 복제 — 문구 드리프트로 기각
 *                  (2) 페이지도 540px 고정 — 320px 화면에서 잘려 기각
 * - Trade-offs   : variant 분기가 몇 군데 생기는 대신 문구·색·레이아웃의 단일 출처가 유지된다.
 * - Edge Case    : 앱 디자인 토큰을 쓰지 않고 고정 색상을 인라인으로 박는다(src/CLAUDE.md 토큰
 *                  규칙 예외). PNG는 앱 밖에서 단독으로 보이고 공유 페이지도 테마와 무관해야
 *                  하는데, 토큰을 쓰면 다크모드에서 카드가 통째로 뒤집힌다.
 *                  축제 키비주얼은 원본 이미지 대신 CSS·SVG로 재현한다 — 저작권 문제가 없고
 *                  외부 이미지 fetch가 없어 캡처 실패 요인도 사라진다.
 */

import { useLayoutEffect, useRef, useState } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { formatCardDate } from './formatCardDate';

/** PNG 렌더 폭(CSS px). 캡처는 pixelRatio 2로 뜨므로 실제 PNG는 1080px 폭이 된다. */
export const CARD_WIDTH = 540;

export const AIDEEP_URL = 'https://aideep.ai.kr';

/**
 * 답변 본문 최대 높이(CSS px). PNG는 2배 해상도라 실제 출력이 최대 1080×16000px 언저리로,
 * 브라우저 canvas 한 변 한계(~16384px) 안에 든다.
 */
const BODY_MAX_HEIGHT = 7600;

const INK = '#243B53';
const MUTED = '#5B7185';
const LINE = '#DCE7F1';
const TINT = '#EEF5FB';
const DEEP = '#0E5AA7';

/** 축제 키비주얼(하늘·구름·물결) 톤. 외부 이미지를 쓰지 않는다. */
const SKY = 'linear-gradient(180deg, #06336E 0%, #0E5AA7 18%, #2E8FD6 40%, #7CC4EC 62%, #C9E7F7 82%, #EFF8FD 100%)';

const MARKDOWN_COMPONENTS: Components = {
  p: ({ children }) => <p style={{ margin: 0, marginTop: 10 }}>{children}</p>,
  ul: ({ children }) => <ul style={{ margin: '10px 0', paddingLeft: 20, listStyleType: 'disc' }}>{children}</ul>,
  ol: ({ children }) => <ol style={{ margin: '10px 0', paddingLeft: 20, listStyleType: 'decimal' }}>{children}</ol>,
  li: ({ children }) => <li style={{ marginTop: 4 }}>{children}</li>,
  a: ({ children }) => <span style={{ color: '#1E7FD4', textDecoration: 'underline' }}>{children}</span>,
  strong: ({ children }) => <strong style={{ fontWeight: 700, color: INK }}>{children}</strong>,
  em: ({ children }) => <em style={{ fontStyle: 'italic' }}>{children}</em>,
  h1: ({ children }) => <p style={{ margin: '14px 0 0', fontSize: 17, fontWeight: 700, color: INK }}>{children}</p>,
  h2: ({ children }) => <p style={{ margin: '14px 0 0', fontSize: 16, fontWeight: 700, color: INK }}>{children}</p>,
  h3: ({ children }) => <p style={{ margin: '12px 0 0', fontSize: 15, fontWeight: 700, color: INK }}>{children}</p>,
  blockquote: ({ children }) => (
    <blockquote style={{ margin: '10px 0', paddingLeft: 12, borderLeft: `3px solid ${LINE}`, color: MUTED }}>{children}</blockquote>
  ),
  hr: () => <hr style={{ margin: '14px 0', border: 0, borderTop: `1px solid ${LINE}` }} />,
  pre: ({ children }) => (
    <pre style={{ margin: '10px 0', padding: 12, borderRadius: 10, background: TINT, fontSize: 12.5, lineHeight: '19px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{children}</pre>
  ),
  code: ({ className, children }) => {
    const isBlock = /language-/.test(className ?? '');
    if (isBlock) return <code style={{ fontFamily: 'var(--font-mono), ui-monospace, monospace' }}>{children}</code>;
    return <code style={{ padding: '1px 5px', borderRadius: 5, background: TINT, fontFamily: 'var(--font-mono), ui-monospace, monospace', fontSize: 13 }}>{children}</code>;
  },
  table: ({ children }) => <table style={{ margin: '10px 0', borderCollapse: 'collapse', fontSize: 13, width: '100%' }}>{children}</table>,
  th: ({ children }) => <th style={{ border: `1px solid ${LINE}`, padding: '6px 8px', textAlign: 'left', background: TINT, fontWeight: 700 }}>{children}</th>,
  td: ({ children }) => <td style={{ border: `1px solid ${LINE}`, padding: '6px 8px' }}>{children}</td>,
};

function Bubble({ size, right, top, opacity }: { size: number; right: string; top: number; opacity: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        right,
        top,
        width: size,
        height: size,
        borderRadius: '50%',
        opacity,
        background:
          'radial-gradient(circle at 34% 28%, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.30) 16%, rgba(168,226,255,0.14) 44%, rgba(198,180,246,0.20) 72%, rgba(255,255,255,0.40) 93%, rgba(255,255,255,0.05) 100%)',
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.5), inset 0 -6px 14px rgba(255,255,255,0.28)',
      }}
    />
  );
}

function Clouds() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: [
          'radial-gradient(120% 46% at 50% 100%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.55) 42%, rgba(255,255,255,0) 72%)',
          'radial-gradient(58% 22% at 16% 62%, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 70%)',
          'radial-gradient(52% 20% at 88% 54%, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0) 70%)',
        ].join(', '),
      }}
    />
  );
}

function WaveRibbon({ top }: { top: number }) {
  return (
    <svg
      viewBox="0 0 540 92"
      preserveAspectRatio="none"
      fill="none"
      style={{ position: 'absolute', left: 0, top, width: '100%', height: 92 }}
      aria-hidden
    >
      <defs>
        <linearGradient id="aideep-wave-a" x1="0" y1="0" x2="540" y2="92" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8CF2D0" />
          <stop offset="0.5" stopColor="#5FD8F0" />
          <stop offset="1" stopColor="#9EE8FF" />
        </linearGradient>
        <linearGradient id="aideep-wave-b" x1="0" y1="92" x2="540" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#BFF7E6" stopOpacity="0.75" />
          <stop offset="1" stopColor="#7EC8FF" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <path d="M-20 52C70 8 150 82 246 46S420 6 560 44" stroke="url(#aideep-wave-a)" strokeWidth="7" strokeLinecap="round" />
      <path d="M-20 70C80 32 156 96 250 62S430 26 560 62" stroke="url(#aideep-wave-b)" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

/** 형광펜 강조 — 글자 뒤에 색 띠를 깔아 "회의"만 눈에 먼저 들어오게 한다. */
function Highlight({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: -4,
          right: -4,
          bottom: 3,
          height: 17,
          borderRadius: 4,
          background: 'linear-gradient(90deg, #8CF2D0 0%, #7EC8FF 100%)',
        }}
      />
      <span style={{ position: 'relative' }}>{children}</span>
    </span>
  );
}

/**
 * 카드 우측 상단 CTA. `page`는 실제 링크, `image`(PNG)는 클릭할 수 없으므로 같은 모양의 뱃지.
 * PNG를 본 사람은 아래 aideep.ai.kr 주소를 보고 찾아온다.
 */
function TryAideepButton({ isPage }: { isPage: boolean }) {
  const shape = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '9px 16px',
    borderRadius: 999,
    background: 'rgba(255,255,255,0.94)',
    color: DEEP,
    fontSize: 12.5,
    fontWeight: 700,
    whiteSpace: 'nowrap' as const,
    boxShadow: '0 6px 16px rgba(4,32,66,0.28)',
  };

  if (isPage) {
    return (
      <a href={AIDEEP_URL} target="_blank" rel="noopener noreferrer" style={{ ...shape, textDecoration: 'none' }}>
        AiDeep 사용해보기 <span aria-hidden>→</span>
      </a>
    );
  }
  return (
    <span style={shape}>
      AiDeep 사용해보기 <span aria-hidden>→</span>
    </span>
  );
}

interface FestivalAnswerCardProps {
  /** AI 답변 마크다운. 없으면 답변 블록 없이 축제 인사만 보인다(링크가 잘려 해시가 유실된 경우). */
  content?: string;
  exportedAt: Date;
  /** `image`는 PNG 캡처용 고정 폭, `page`는 공유 링크용 유동 폭. */
  variant?: 'image' | 'page';
}

export default function FestivalAnswerCard({ content, exportedAt, variant = 'image' }: FestivalAnswerCardProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const isPage = variant === 'page';

  // PNG는 canvas 높이 한계가 있어 넘칠 때만 잘라내고 안내를 붙인다. 페이지는 그냥 스크롤하면 된다.
  useLayoutEffect(() => {
    if (isPage) return;
    const body = bodyRef.current;
    if (body) setIsTruncated(body.scrollHeight > BODY_MAX_HEIGHT);
  }, [content, isPage]);

  // AiDeep 워드마크가 커진 만큼 물결을 아래로 내려 글자와 겹치지 않게 한다.
  const waveTop = content ? 186 : 194;

  return (
    <div
      style={{
        position: 'relative',
        width: isPage ? '100%' : CARD_WIDTH,
        maxWidth: CARD_WIDTH,
        overflow: 'hidden',
        background: SKY,
        color: '#FFFFFF',
        fontFamily: 'var(--font-sans), var(--font-noto-sans-kr), ui-sans-serif, system-ui, sans-serif',
      }}
    >
      <Clouds />
      {/* 좁은 폭에서 타이틀이 오른쪽으로 길어지므로, 버블은 글자 밴드를 피해 위·아래로 둔다. */}
      {/* 우측 상단은 CTA 자리라 큰 버블은 그 아래 빈 영역으로 내린다. */}
      <Bubble size={72} right="6%" top={112} opacity={0.8} />
      <Bubble size={44} right="24%" top={192} opacity={0.75} />
      <Bubble size={26} right="86%" top={205} opacity={0.65} />
      <WaveRibbon top={waveTop} />

      <div style={{ position: 'relative', padding: '34px 30px 30px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <p style={{ margin: 0, fontSize: 12.5, letterSpacing: '0.02em', color: 'rgba(255,255,255,0.82)' }}>
              AiDeep과 함께 기억하는
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 700, textShadow: '0 1px 3px rgba(4,32,66,0.35)' }}>
              {formatCardDate(exportedAt)}
            </p>
          </div>
          <TryAideepButton isPage={isPage} />
        </div>

        <div style={{ marginTop: 18 }}>
          <p style={{ margin: 0, fontSize: 22, fontWeight: 700, lineHeight: '29px', letterSpacing: '-0.01em', textShadow: '0 2px 6px rgba(4,32,66,0.35)' }}>
            Sustainable Wave Festival
          </p>
          <p style={{ margin: '2px 0 0', display: 'flex', alignItems: 'baseline', gap: 8, textShadow: '0 2px 8px rgba(4,32,66,0.35)' }}>
            <span style={{ fontSize: 20, fontWeight: 500, color: 'rgba(255,255,255,0.8)' }}>×</span>
            <span style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.02em', color: '#DFFBF1' }}>AiDeep</span>
          </p>
        </div>

        {content && (
          <div
            style={{
              marginTop: 78,
              padding: 22,
              borderRadius: 20,
              background: 'rgba(255,255,255,0.94)',
              border: '1px solid rgba(255,255,255,0.9)',
              boxShadow: '0 14px 34px rgba(6,44,92,0.24)',
              color: INK,
              fontSize: 14.5,
              lineHeight: '23px',
            }}
          >
            <div
              ref={bodyRef}
              style={{
                position: 'relative',
                maxHeight: isPage ? undefined : BODY_MAX_HEIGHT,
                overflow: isPage ? undefined : 'hidden',
                wordBreak: 'break-word',
              }}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
                {content}
              </ReactMarkdown>
              {isTruncated && (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: 88,
                    background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.96) 70%)',
                  }}
                />
              )}
            </div>
            {isTruncated && (
              <p style={{ margin: '10px 0 0', fontSize: 12, color: MUTED }}>전체 내용은 AiDeep에서 확인하세요</p>
            )}
          </div>
        )}

        <div style={{ marginTop: content ? 24 : 92 }}>
          <p style={{ margin: 0, fontSize: 13, lineHeight: '21px', color: '#2E6C9E' }}>
            지치는 일상 속, 힐링되는 하루 즐거우셨나요?
          </p>
          <p style={{ margin: '6px 0 0', fontSize: 14, lineHeight: '22px', color: '#2E6C9E' }}>
            이제 그 일상의 지침도 저희가 덜어드릴게요.
          </p>
          <p style={{ margin: '16px 0 0', fontSize: 15, lineHeight: '24px', color: '#1A4E7A' }}>
            우리가 가장 많이 하는 대화,
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 30, fontWeight: 800, lineHeight: '40px', letterSpacing: '-0.02em', color: '#0B3E70' }}>
            <Highlight>회의</Highlight>는 AiDeep이 정리합니다
          </p>
        </div>

        <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid rgba(14,90,167,0.18)' }}>
          <p style={{ margin: 0, fontSize: 13, lineHeight: '21px', color: '#2E6C9E' }}>
            아직 프로토타입이에요. 여기서 멈추지 않습니다.
            <br />
            완성되어 가는 과정을 지켜봐 주세요.
          </p>
        </div>

        <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: 11.5, fontWeight: 500, color: '#5B8FB9' }}>aideep.ai.kr</span>
        </div>
      </div>
    </div>
  );
}
