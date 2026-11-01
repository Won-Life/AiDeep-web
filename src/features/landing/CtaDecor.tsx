import Image from 'next/image';

type Piece = {
  src: string;
  width: number;
  height: number;
  left: number;
  top: number;
};

/* 1440px 시안 기준 좌표(마지막 호출 섹션 위쪽 기준). 장식용 그림이라 값으로 둔다. */
const WAVES: readonly Piece[] = [
  { src: 'waves-back.svg', width: 2086.49, height: 415.62, left: -653.5, top: 53 },
  { src: 'waves-front.svg', width: 1441.04, height: 242.52, left: -889, top: 218 },
];

const CHARACTERS: readonly Piece[] = [
  { src: 'blob-blue.svg', width: 128.49, height: 111.15, left: 585.7, top: 350.7 },
  { src: 'eye.svg', width: 12.38, height: 18.54, left: 639.3, top: 376.9 },
  { src: 'eye.svg', width: 12.35, height: 18.55, left: 666.5, top: 377.3 },
  { src: 'blob-pink.svg', width: 103.69, height: 86.95, left: 722.1, top: 368 },
  { src: 'eye.svg', width: 9.14, height: 13.85, left: 755.1, top: 384 },
  { src: 'eye.svg', width: 9.14, height: 13.85, left: 776, top: 384.2 },
];

function Layer({ pieces }: { pieces: readonly Piece[] }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-y-0 left-1/2 w-[1440px] -translate-x-1/2">
      {pieces.map(({ src, width, height, left, top }) => (
        <Image
          key={`${src}-${left}`}
          src={`/onnode/landing/cta/${src}`}
          alt=""
          width={width}
          height={height}
          unoptimized
          className="absolute max-w-none"
          style={{ left, top, width, height }}
        />
      ))}
    </div>
  );
}

/** 마지막 호출 뒤의 물결(글 아래)과 하단의 두 캐릭터(글 위). */
export function CtaWaves() {
  return <Layer pieces={WAVES} />;
}

export function CtaCharacters() {
  return <Layer pieces={CHARACTERS} />;
}
