'use client';
import { useRef, useState } from 'react';
import { EMAIL_RE, submitEarlyAccessEmail } from '@/lib/earlyAccessForm';

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

type NotifyStatus = 'ask' | 'saving' | 'done' | 'error';

/** 준비중 안내 + 얼리액세스 이메일 신청 모달 */
function ComingSoonModal({
  feature,
  status,
  onSubmit,
  onClose,
}: {
  feature: ComingSoonFeature;
  status: NotifyStatus;
  onSubmit: (email: string) => void;
  onClose: () => void;
}) {
  const [email, setEmail] = useState('');
  const [invalid, setInvalid] = useState(false);

  const submit = () => {
    if (!EMAIL_RE.test(email.trim())) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    onSubmit(email.trim());
  };

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

        {status === 'done' ? (
          <>
            <p className="text-[14px] text-foreground leading-relaxed">
              신청 완료! 출시 소식이 준비되면 입력하신 이메일로 알려드릴게요.
            </p>
            <button
              onClick={onClose}
              className="h-[32px] rounded-[8px] bg-main text-white text-[13px]"
            >
              확인
            </button>
          </>
        ) : (
          <>
            <p className="text-[14px] text-foreground leading-relaxed">
              준비 중인 기능입니다. 기능이 완성되면 사용하실 수 있게 이메일로 소식을 받아보시겠어요?
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (invalid) setInvalid(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit();
              }}
              disabled={status === 'saving'}
              placeholder="이메일 주소"
              className="h-[36px] rounded-[8px] bg-surface text-foreground text-[13px] px-3 border border-border outline-none focus:border-main disabled:opacity-50"
            />
            {invalid && (
              <p className="text-[12px] text-muted">이메일 형식을 확인해주세요.</p>
            )}
            {status === 'error' && (
              <p className="text-[12px] text-muted">
                전송에 실패했어요. 다시 시도해주세요.
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={submit}
                disabled={status === 'saving'}
                className="flex-1 h-[32px] rounded-[8px] bg-main text-white text-[13px] disabled:opacity-50"
              >
                {status === 'saving' ? '전송 중...' : '신청'}
              </button>
              <button
                onClick={onClose}
                className="flex-1 h-[32px] rounded-[8px] bg-surface text-foreground text-[13px] border border-border"
              >
                아니오
              </button>
            </div>
          </>
        )}
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
  const [notifyStatus, setNotifyStatus] = useState<NotifyStatus>('ask');
  // 모달을 닫았다 다시 열면 이전 fetch가 뒤늦게 resolve되며 새 화면 상태를 덮는 것을 막는 토큰
  const notifyRequestRef = useRef(0);

  // onChatOpen: 챗봇 준비중 처리 이후 미사용. 패널 재활성화 시 openComingSoon 대신 연결.
  void onChatOpen;

  const openComingSoon = (feature: ComingSoonFeature) => {
    notifyRequestRef.current += 1;
    setNotifyStatus('ask');
    setComingSoonFeature(feature);
  };

  const handleNotifySubmit = async (email: string) => {
    const requestId = ++notifyRequestRef.current;
    setNotifyStatus('saving');
    try {
      await submitEarlyAccessEmail(email);
      if (notifyRequestRef.current === requestId) setNotifyStatus('done');
    } catch {
      if (notifyRequestRef.current === requestId) setNotifyStatus('error');
    }
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
          status={notifyStatus}
          onSubmit={handleNotifySubmit}
          onClose={() => setComingSoonFeature(null)}
        />
      )}
    </div>
  );
}
