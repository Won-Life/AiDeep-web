import Image from 'next/image';
import type { PainPoint } from './painPoints';

export default function PainPointCard({ point }: { point: PainPoint }) {
  const { image, title, lines, titlePos, bodyPos } = point;
  return (
    <article className="relative h-[234px] w-[304px] shrink-0 rounded-[20px] border border-[var(--landing-primary-border)]">
      {/* 시안 좌표는 테두리 바깥 기준이라, 테두리 1px만큼 되돌린 틀 안에 둔다 */}
      <div className="absolute -inset-px">
        <Image
          src={image.src}
          alt=""
          width={image.width}
          height={image.height}
          className="absolute max-w-none"
          style={{ left: image.left, top: image.top, width: image.width, height: image.height }}
        />
        <h3
          className="absolute text-[18px] leading-[1.5] font-bold whitespace-nowrap text-black"
          style={{ left: titlePos.left, top: titlePos.top }}
        >
          {title}
        </h3>
        <p
          className="absolute w-[226px] text-[16px] leading-[1.5] text-black"
          style={{ left: bodyPos.left, top: bodyPos.top }}
        >
          {lines.map((line) => (
            <span key={line} className="block">{line}</span>
          ))}
        </p>
      </div>
    </article>
  );
}
