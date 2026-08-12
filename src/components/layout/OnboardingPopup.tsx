'use client';
import { useState, useSyncExternalStore } from 'react';
import { PRIVACY_URL } from '@/lib/legalLinks';

export const ONBOARDING_URL = 'https://won-life.github.io/Aideep_graph_onboard/';
export const MEET_ONBOARDING_URL = 'https://won-life.github.io/Aideep_meet_onboard/';
// 크롬 웹스토어에 출시된 AiDeep for Google Meet 익스텐션
export const CHROME_EXTENSION_URL =
  'https://chromewebstore.google.com/detail/aideep-for-google-meet/nheeajgmccanipbkppfjogaajinlhdcd?hl=ko&authuser=0';
export const ONBOARDING_SEEN_KEY = 'aideep_onboarding_seen';

const noopSubscribe = () => () => {};

// /workspace는 정적 프리렌더 대상이라 서버에서는 window가 없다. lazy useState로 바로
// localStorage를 읽으면 서버(false)·클라(fresh 방문자면 true) 스냅샷이 달라져 하이드레이션
// 불일치가 나고, 그 불일치 때문에 팝업 자체가 조용히 렌더되지 않는 문제가 있었다.
// useSyncExternalStore는 getServerSnapshot을 강제해 첫 페인트를 서버와 동일하게 맞추고,
// 마운트 후에만 실제 값으로 갱신한다.
export function useOnboardingSeen(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => localStorage.getItem(ONBOARDING_SEEN_KEY) !== null,
    () => true,
  );
}

export default function OnboardingPopup() {
  const seen = useOnboardingSeen();
  const [dismissed, setDismissed] = useState(false);
  // ponytail: graph-onboard(step 0) 건너뛰고 meet-onboard(step 1)만 테스트하기 위해 기본값 변경
  const [step, setStep] = useState<0 | 1>(1);
  const isOpen = !seen && !dismissed;

  const close = () => {
    try {
      localStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
    } finally {
      setDismissed(true);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={close}
    >
      <div
        className="flex w-[420px] max-w-[90vw] flex-col gap-[20px] rounded-[16px] border border-gray-700 bg-background p-[24px]"
        onClick={(e) => e.stopPropagation()}
      >
        {step === 0 ? (
          <>
            <div className="flex items-start justify-between">
              <h2 className="text-[20px] font-bold text-foreground">
                AiDeep이 처음이신가요?
              </h2>
              <button
                type="button"
                onClick={close}
                aria-label="닫기"
                className="text-muted hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <p className="text-[14px] leading-[22px] text-muted">
              <strong className="font-bold text-foreground">
                그래프 만들기, 노드 안에서 바로 편집하기, 자유롭게 옮기며 정리하기
              </strong>
              까지 — AiDeep 사용법을 1분 만에 보여드릴게요.
            </p>

            <div className="flex gap-[12px]">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="h-[44px] flex-1 rounded-[8px] border border-border bg-background text-[14px] font-semibold text-muted transition-colors hover:bg-surface"
              >
                나중에
              </button>
              <a
                href={ONBOARDING_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setStep(1)}
                className="flex h-[44px] flex-1 items-center justify-center rounded-[8px] bg-main text-[14px] font-semibold text-white transition-colors hover:opacity-90"
              >
                사용법 보기
              </a>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <h2 className="text-[20px] font-bold text-foreground">
                AiDeep X 구글 미트, 지금 만나보세요
              </h2>
              <button
                type="button"
                onClick={close}
                aria-label="닫기"
                className="text-muted hover:text-foreground"
              >
                ✕
              </button>
            </div>

            {/* 익스텐션은 크롬 웹스토어에 출시된 상태 — "곧 만나요·얼리액세스" 안내는
                랜딩·웹스토어와 메시지가 어긋나므로 설치 안내로 교체 (#213, 피드백 2·24) */}
            <p className="text-[14px] leading-[22px] text-muted">
              구글 미트 자막으로{' '}
              <strong className="font-bold text-foreground">
                회의 내용을 실시간으로 구조화하고, 회의록을 자동으로 만들어주는
              </strong>{' '}
              크롬 익스텐션이 출시됐어요. 회의가 끝나면 회의록이 워크스페이스에
              그래프로 정리돼 있어요.
            </p>

            <a
              href={MEET_ONBOARDING_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[14px] text-blue-600 underline hover:text-blue-700"
            >
              어떻게 동작하는지 둘러보기
            </a>

            {/* 외부 AI 처리 고지 — 기능 사용 지점 근처 노출 (#206, 피드백 16) */}
            <p className="text-[12px] leading-[18px] text-muted">
              회의 자막과 발화자 이름은 회의록 생성을 위해 외부 AI로 처리됩니다.
              자세한 내용은{' '}
              <a
                href={PRIVACY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-foreground"
              >
                개인정보처리방침
              </a>
              을 확인해주세요.
            </p>

            <div className="flex gap-[12px]">
              <button
                type="button"
                onClick={close}
                className="h-[44px] flex-1 rounded-[8px] border border-border bg-background text-[14px] font-semibold text-muted transition-colors hover:bg-surface"
              >
                닫기
              </button>
              <a
                href={CHROME_EXTENSION_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-[44px] flex-1 items-center justify-center rounded-[8px] bg-main text-[14px] font-semibold text-white transition-colors hover:opacity-90"
              >
                크롬 익스텐션 설치하기
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
