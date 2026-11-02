import Image from 'next/image';

/*
 * 문제 제기에서 기능 소개로 넘어가는 띠. 문구를 두고, 위쪽 가운데의 화살표가 소개 영역과 이어 준다.
 * 시안의 화살표는 가로 SVG를 90도 돌린 것이라 같은 방식으로 돌려 쓴다.
 * 시안 프레임이 틀 밖으로 나온 화살표 윗부분을 잘라 내므로, 같은 이유로 overflow를 숨긴다.
 */
export default function TransitionSection() {
  return (
    <section className="relative h-[287px] overflow-hidden bg-white">
      <div className="pointer-events-none absolute -top-6 left-1/2 flex h-[106px] w-0 items-center justify-center" aria-hidden>
        <div className="flex-none rotate-90">
          <div className="relative h-0 w-[106px]">
            <div className="absolute inset-[-8.66px_0_-8.66px_-1.42%]">
              <Image src="/onnode/landing/transition-arrow.svg" alt="" width={107.5} height={17.32} className="block size-full max-w-none" />
            </div>
          </div>
        </div>
      </div>
      <h2 className="absolute top-[99px] left-1/2 w-[944.58px] -translate-x-1/2 text-center text-[28.34px] leading-[1.5] font-bold text-[var(--landing-primary)]">
        그래서, 회의가 어떻게 정리되는 거지?
      </h2>
      <p className="absolute top-[165.12px] left-1/2 w-[1006.18px] -translate-x-1/2 text-center text-[21.56px] leading-[1.5] text-[var(--landing-text-muted)]">
        회의가 진행되는 동안 노드가 쌓이고, 끝나면 마인드맵으로 정리돼요.
      </p>
    </section>
  );
}
