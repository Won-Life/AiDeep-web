import Image from 'next/image';

type TryAssetProps = {
  name: string;
  width: number;
  height: number;
  className?: string;
};

/** 체험 화면에 쓰는 장식용 그림(SVG/PNG). 그대로 내려보내고 스크린리더에는 숨긴다. */
export default function TryAsset({ name, width, height, className = '' }: TryAssetProps) {
  return (
    <Image
      src={`/onnode/landing/try/${name}`}
      alt=""
      aria-hidden
      width={width}
      height={height}
      unoptimized
      className={`block max-w-none ${className}`}
    />
  );
}
