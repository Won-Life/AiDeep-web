'use client';

import { useId } from 'react';
import { motion, useTransform, type MotionValue } from 'motion/react';

// Figma 418:39461 / 418:39476의 원본 SVG 전체 경로를 유지한다.
const characters = {
  pink: {
    width: 102.683,
    height: 87.1845,
    rotation: 16.15,
    body: 'M51.4352 87.0702C79.7388 87.1333 102.642 67.7186 102.59 43.7063C102.538 19.694 79.5518 0.177126 51.2482 0.114084C22.9446 0.0510416 0.0418255 19.4657 0.0934643 43.478C0.145103 67.4903 23.1316 87.0072 51.4352 87.0702Z',
    eyes: [
      'M55.8703 60.0383C59.1461 59.5974 61.2449 55.1599 60.5581 50.127C59.8713 45.0941 56.6591 41.3716 53.3833 41.8126C50.1075 42.2535 48.0087 46.691 48.6955 51.7239C49.3823 56.7568 52.5945 60.4793 55.8703 60.0383Z',
      'M26.7386 64.0526C30.0144 63.6116 32.1132 59.1742 31.4264 54.1413C30.7396 49.1083 27.5274 45.3858 24.2516 45.8268C20.9758 46.2677 18.877 50.7052 19.5638 55.7381C20.2506 60.771 23.4628 64.4935 26.7386 64.0526Z',
    ],
    gradient: {
      x1: 25.8559,
      y1: 10.4642,
      x2: 51.4929,
      y2: 87.0509,
      start: '#FFEBF3',
      end: '#F297C1',
      offset: 0,
    },
  },
  blue: {
    width: 151.078,
    height: 138.271,
    rotation: -51.83,
    body: 'M133.908 88.816C132.672 93.4284 128.659 105.639 117.378 114.347C97.9639 129.335 73.4679 122.593 60.0114 118.75C45.2363 114.535 26.9722 107.023 18.4909 89.2812C9.76938 71.0296 15.1942 54.0672 16.9611 49.811C18.3853 46.3756 25.8782 26.7417 49.7024 19.1528C68.0447 13.3088 85.2181 17.0217 93.0408 20.0449C99.6177 22.586 118.215 30.105 128.543 50.268C131.176 55.4112 138.854 70.396 133.908 88.816Z',
    eyes: [
      'M66.0895 75.9138C67.4956 72.8076 66.1367 69.1886 63.0543 67.8305C59.972 66.4724 56.3333 67.8894 54.9272 70.9956L52.3744 76.635C50.9683 79.7411 52.3272 83.3601 55.4095 84.7182C58.4919 86.0764 62.1306 84.6593 63.5367 81.5531L66.0895 75.9138Z',
      'M89.0137 85.5938C90.6238 82.5864 89.5121 78.88 86.5309 77.3154C83.5496 75.7507 79.8276 76.9203 78.2175 79.9277L75.2944 85.3878C73.6844 88.3952 74.796 92.1016 77.7773 93.6662C80.7586 95.2309 84.4806 94.0613 86.0906 91.0539L89.0137 85.5938Z',
    ],
    gradient: {
      x1: 99.8235,
      y1: 25.8163,
      x2: 37.5964,
      y2: 106.202,
      start: '#AFC7FC',
      end: '#839EFB',
      offset: 0.170405,
    },
  },
};

/*
 * CONTEXT
 * - Problem      : 몸은 유지하고 눈만 카드 스크롤을 따라 움직여야 한다.
 * - Why          : Figma 원본 SVG를 인라인으로 보존하고 눈 두 경로에만 Motion을 적용한다.
 * - Alternatives : 전체 이미지 이동은 눈 추적이 아니며 원본 모양 재작성은 피한다.
 * - Trade-offs   : 스크롤 끝까지 눈 이동을 6px로 제한해 몸 밖으로 나가지 않게 한다.
 * - Edge Case    : 정적 회전을 역산하며 reduced motion에서는 눈도 움직이지 않는다.
 */
export default function SignupCharacter({
  variant,
  progress,
  reducedMotion,
}: {
  variant: keyof typeof characters;
  progress: MotionValue<number>;
  reducedMotion: boolean;
}) {
  const character = characters[variant];
  const gradientId = useId();
  const angle = (character.rotation * Math.PI) / 180;
  const x = useTransform(progress, [0, 1], [0, Math.sin(angle) * 6]);
  const y = useTransform(progress, [0, 1], [0, Math.cos(angle) * 6]);
  return (
    <svg
      width={character.width}
      height={character.height}
      viewBox={`0 0 ${character.width} ${character.height}`}
      fill="none"
      className="block overflow-visible"
      aria-hidden="true"
    >
      <path d={character.body} fill={`url(#${gradientId})`} />
      <motion.g
        data-signup-eyes={variant}
        style={{ x: reducedMotion ? 0 : x, y: reducedMotion ? 0 : y }}
      >
        {character.eyes.map((path, index) => (
          <path key={index} d={path} fill="black" />
        ))}
      </motion.g>
      <defs>
        <linearGradient
          id={gradientId}
          x1={character.gradient.x1}
          y1={character.gradient.y1}
          x2={character.gradient.x2}
          y2={character.gradient.y2}
          gradientUnits="userSpaceOnUse"
        >
          <stop
            offset={character.gradient.offset}
            stopColor={character.gradient.start}
          />
          <stop offset="1" stopColor={character.gradient.end} />
        </linearGradient>
      </defs>
    </svg>
  );
}
