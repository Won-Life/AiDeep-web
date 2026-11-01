import Image from 'next/image';
import type { Target } from './targets';

/** 추천 대상 카드: 위는 일러스트(카드 밖으로 살짝 나옴), 아래는 옅은 파랑 띠에 제목과 설명 */
export default function TargetCard({ target }: { target: Target }) {
  const { title, description, image } = target;
  return (
    <article className="relative h-[472px] rounded-[20px] bg-white [box-shadow:var(--landing-card-shadow)]">
      <Image
        src={image.src}
        alt=""
        width={image.width}
        height={image.height}
        className="absolute h-auto max-w-none"
        style={{ left: `${image.leftPct}%`, width: `${image.widthPct}%`, top: image.top }}
      />
      <div className="absolute inset-x-0 bottom-0 flex h-[106px] flex-col rounded-b-[20px] bg-[var(--landing-tint)] px-[46px] pt-5">
        <h3 className="text-[20px] leading-[1.5] font-bold text-[var(--landing-text)]">{title}</h3>
        <p className="mt-4 text-[14px] leading-[1.5] text-[var(--landing-text-muted)]">{description}</p>
      </div>
    </article>
  );
}
