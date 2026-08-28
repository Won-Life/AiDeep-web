"use client";

import Image from "next/image";

const LANDING_URL = "https://won-life.github.io/Aideep_meet_onboard/";
const INSTAGRAM_URL = "https://www.instagram.com/aideep.official?utm_source=qr";
const FLEA_MARKET_MAP_SRC = "/images/festival/flea-market-map.png";

// 크롭한 배치도의 가로:세로 비. 지도 박스는 이 비를 유지한 채 높이에 맞춰 폭이 정해진다.
const MAP_ASPECT_RATIO = 1.29;

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
 * - Edge Case    : 오버레이·닫기 버튼 모두로 언제든 닫는다.
 */

/*
 * CONTEXT (모바일 반응형)
 * - Problem      : iPhone SE(375x667)급 화면에서 패널이 뷰포트보다 커져 제목과 CTA가 잘렸다.
 *                  고정 px 여백 + 폭 기준 aspect-ratio 지도가 세로 공간을 무시하고 높이를
 *                  키우는 게 원인이었다.
 * - Why          : 크기를 전부 비율로 잡는다. 패널은 뷰포트의 92vw x 88dvh 안에 갇히고,
 *                  내부 여백·요소는 부모 기준 %로 따라 줄어든다. 세로는 flex 3단
 *                  (헤더 / 본문 / 푸터)으로 나눠 헤더·본문 텍스트·푸터가 자기 높이를 먼저
 *                  가져가고, 남은 공간 전부를 지도가 flex-1로 흡수한다.
 * - Alternatives : ① 지도에 max-height만 거는 안 — aspect-ratio와 충돌해 크롭이 어긋난다.
 *                  ② 모바일에서 지도를 숨기는 안 — 부스 위치가 이 팝업의 핵심 정보라 폐기.
 *                  ③ 전체 스크롤 유지 — 사용자가 CTA·지도를 못 보고 닫는 문제가 그대로다.
 * - Trade-offs   : 세로가 짧을수록 지도가 작아진다. 대신 어떤 기기에서도 스크롤 없이
 *                  제목·혜택·지도·CTA가 한 화면에 들어온다.
 * - Edge Case    : 지도는 min-height로 하한을 두고, 그보다도 공간이 없는 극단적 화면
 *                  (320x568 가로모드 등)에서는 본문만 스크롤된다. 지도 박스는 높이에서
 *                  aspect-ratio로 폭을 되돌려 계산하므로 크롭 좌표(%)가 항상 유지된다.
 */
export default function FestivalPopup({ isOpen, onClose }: FestivalPopupProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-[4vw] sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="festival-popup-title"
        className="flex h-auto max-h-[88dvh] w-[92vw] max-w-[460px] flex-col overflow-hidden rounded-[16px] border border-gray-700 bg-background sm:max-h-[calc(100dvh-32px)] sm:w-full"
        onClick={(event) => event.stopPropagation()}
      >
        {/* 헤더 — 자기 높이만 차지 */}
        <div className="flex shrink-0 items-start justify-between gap-[3%] px-[5%] pt-[4%] sm:px-6 sm:pt-6">
          <div>
            <p className="typo-cap3 text-main">AiDeep at Festival</p>
            <h2
              id="festival-popup-title"
              className="mt-1 break-keep text-[18px] font-bold leading-[1.4] text-foreground min-[360px]:text-[20px] sm:text-[22px]"
            >
              기록하느라 두 번 일하지 마세요.
            </h2>
          </div>
          <button
            type="button"
            aria-label="팝업 닫기"
            onClick={onClose}
            className="-mr-[2%] -mt-[2%] flex aspect-square w-[11%] min-w-9 max-w-10 shrink-0 items-center justify-center rounded-full text-[20px] leading-none text-muted transition-colors hover:bg-surface hover:text-foreground"
          >
            ×
          </button>
        </div>

        {/* 본문 — 남는 세로 공간을 전부 차지하고, 그 안에서 지도가 나머지를 흡수 */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-[5%] pb-[4%] sm:px-6 sm:pb-5">
          <p className="mt-[3%] shrink-0 break-keep text-[13px] leading-[1.6] text-muted min-[360px]:text-[14px] sm:text-[15px]">
            회의와 생각을 실시간으로 정리하고,
            <br />
            기록을 그래프로 연결하는 AiDeep입니다.
            <span className="mt-1 block text-foreground">
              오늘 플리마켓에서 직접 만나보세요.
            </span>
          </p>

          <ul className="mt-[4%] grid shrink-0 gap-[2%] break-keep text-[12px] leading-[1.5] text-foreground min-[360px]:text-[13px] sm:gap-2 sm:text-[14px]">
            <li className="rounded-[8px] bg-surface px-[4%] py-[1.5%] sm:py-2">🎁 1등 상품 7만원 상당</li>
            <li className="rounded-[8px] bg-surface px-[4%] py-[1.5%] sm:py-2">🥤 시원한 음료 할인</li>
            <li className="rounded-[8px] bg-surface px-[4%] py-[1.5%] sm:py-2">
              ✨ 보기만 해도 웃음이 나는 스티커 제공
            </li>
          </ul>

          {/* 지도 — 높이를 뷰포트 비율(dvh)로 확정하고 aspect-ratio가 그 높이에서 폭을 되돌려
              계산한다. flex stretch나 퍼센트 높이는 주축(폭) 계산 시점에 확정 높이로 취급되지
              않아 폭이 0으로 무너지므로 쓰지 않는다. */}
          <div className="mt-[4%] flex shrink-0 justify-center sm:mt-5">
            <div
              className="relative h-[22dvh] max-h-[220px] min-h-[104px] max-w-full overflow-hidden rounded-[12px] border border-border bg-surface min-[360px]:h-[24dvh] sm:h-auto sm:max-h-none sm:w-full"
              style={{ aspectRatio: MAP_ASPECT_RATIO }}
            >
              <div
                className="absolute inset-[4px] overflow-hidden rounded-[8px]"
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
                  <span className="flex aspect-square w-[11%] min-w-7 items-center justify-center rounded-full border-2 border-background bg-main text-[11px] font-bold text-white">
                    18
                  </span>
                  <span className="mx-auto block h-2 w-2 -translate-y-1 rotate-45 bg-main" />
                </div>
                <div className="absolute bottom-[3%] left-[3%] rounded-[6px] bg-background px-[3%] py-[1%] text-[11px] font-bold text-foreground">
                  AiDeep · 18번 부스
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 푸터 — 뷰포트가 짧아도 CTA는 항상 스크롤 영역 밖에 남는다 */}
        <div className="grid shrink-0 grid-cols-2 gap-[2%] border-t border-border px-[5%] py-[3%] sm:gap-2 sm:px-6 sm:py-4">
          <a
            href={LANDING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-[44px] items-center justify-center whitespace-nowrap rounded-[8px] bg-main text-[12px] font-semibold text-white transition-opacity hover:opacity-90 min-[360px]:text-[13px] sm:text-[14px]"
          >
            AiDeep 더 알아보기
          </a>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-[44px] items-center justify-center whitespace-nowrap rounded-[8px] border border-border bg-background text-[12px] font-semibold text-foreground transition-colors hover:bg-surface min-[360px]:text-[13px] sm:text-[14px]"
          >
            Instagram
          </a>
        </div>
      </section>
    </div>
  );
}
