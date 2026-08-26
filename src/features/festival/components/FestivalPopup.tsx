"use client";

import Image from "next/image";

const LANDING_URL = "https://won-life.github.io/Aideep_meet_onboard/";
const INSTAGRAM_URL = "https://www.instagram.com/aideep.official?utm_source=qr";
const FLEA_MARKET_MAP_SRC = "/images/festival/flea-market-map.png";

interface FestivalPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

/*
 * CONTEXT
 * - Problem      : QR 게스트가 그래프 체험 뒤 AiDeep의 행사 부스 위치와 다음 행동을
 *                  빠르게 이해할 수 있는 안내가 필요하다.
 * - Why          : 기존 OnboardingPopup과 ArchiveModal의 오버레이·다크 패널·버튼 패턴을
 *                  따르고, 제공된 배치도에서 행사장 지도만 크롭해 18번 위치에 핀을 겹친다.
 * - Alternatives : 배치도 전체를 축소하면 부스 위치를 찾기 어렵고, 별도 페이지 전환은
 *                  그래프 탐색 흐름을 끊는다.
 * - Trade-offs   : 원본 지도 좌표를 정적으로 배치하므로 원본이 교체되면 핀 위치도 조정해야 한다.
 * - Edge Case    : 작은 뷰포트에서는 패널을 스크롤하고, 오버레이·닫기 버튼 모두로 언제든 닫는다.
 */
export default function FestivalPopup({ isOpen, onClose }: FestivalPopupProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="festival-popup-title"
        className="max-h-[calc(100dvh-32px)] w-full max-w-[460px] overflow-y-auto rounded-[16px] border border-gray-700 bg-background p-5 sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="typo-cap3 text-main">AiDeep at Festival</p>
            <h2
              id="festival-popup-title"
              className="mt-1 text-[22px] font-bold leading-[30px] text-foreground"
            >
              기록하느라 두 번 일하지 마세요.
            </h2>
          </div>
          <button
            type="button"
            aria-label="팝업 닫기"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[20px] leading-none text-muted transition-colors hover:bg-surface hover:text-foreground"
          >
            ×
          </button>
        </div>

        <p className="mt-4 text-[15px] leading-[24px] text-muted">
          회의와 생각을 실시간으로 정리하고,
          <br />
          기록을 그래프로 연결하는 AiDeep입니다.
          <br />
          <span className="mt-2 block text-foreground">
            오늘 플리마켓에서 직접 만나보세요.
          </span>
        </p>

        <ul className="mt-5 grid gap-2 text-[14px] leading-[20px] text-foreground">
          <li className="rounded-[8px] bg-surface px-3 py-2">🎁 1등 상품 7만원 상당</li>
          <li className="rounded-[8px] bg-surface px-3 py-2">🥤 시원한 음료 할인</li>
          <li className="rounded-[8px] bg-surface px-3 py-2">✨ AiDeep 스티커 무료 제공</li>
        </ul>

        <div className="mt-5 overflow-hidden rounded-[12px] border border-border bg-surface p-2">
          <div
            className="relative aspect-[1.29] overflow-hidden rounded-[8px]"
            aria-label="플리마켓 배치도에서 AiDeep 18번 부스 위치"
          >
            <Image
              src={FLEA_MARKET_MAP_SRC}
              alt="플리마켓 배치도"
              width={1100}
              height={780}
              className="absolute left-[-111.5%] top-[-19.5%] w-[216%] max-w-none"
            />
            <div className="absolute left-[37%] top-[56%] -translate-x-1/2 -translate-y-full">
              <span className="flex h-9 min-w-9 items-center justify-center rounded-full border-2 border-background bg-main px-2 text-[12px] font-bold text-white">
                18
              </span>
              <span className="mx-auto block h-2 w-2 -translate-y-1 rotate-45 bg-main" />
            </div>
            <div className="absolute bottom-2 left-2 rounded-[6px] bg-background px-2 py-1 text-[12px] font-bold text-foreground">
              AiDeep · 18번 부스
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <a
            href={LANDING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-[44px] items-center justify-center rounded-[8px] bg-main text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            AiDeep 더 알아보기
          </a>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-[44px] items-center justify-center rounded-[8px] border border-border bg-background text-[14px] font-semibold text-foreground transition-colors hover:bg-surface"
          >
            Instagram
          </a>
        </div>
      </section>
    </div>
  );
}
