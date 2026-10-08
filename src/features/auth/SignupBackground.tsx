'use client';

import Image from 'next/image';
import { useEffect, type RefObject } from 'react';
import {
  motion,
  useAnimationControls,
  useReducedMotion,
  useScroll,
  type Variants,
} from 'motion/react';
import SignupCharacter from './SignupCharacter';

// Figma 418:39457의 원본 타임라인. 눈 추적은 별도 카드 스크롤 값이다.
const signupMotion = {
  pink: {
    initial: { x: -57, y: 85 },
    play: {
      x: [-57, 1, 1],
      y: [85, 10, 10],
      transition: {
        x: {
          duration: 3.259,
          times: [0, 0.2547, 1],
          ease: 'linear',
          repeat: Infinity,
        },
        y: {
          duration: 3.259,
          times: [0, 0.2547, 1],
          ease: 'linear',
          repeat: Infinity,
        },
      },
    },
    rest: { x: 1, y: 10 },
  },
  blue: {
    initial: { x: 31 },
    play: {
      x: [31, 5, 5],
      transition: {
        x: {
          duration: 3.259,
          times: [0, 0.3187, 1],
          ease: 'linear',
          repeat: Infinity,
        },
      },
    },
    rest: { x: 5 },
  },
} satisfies Record<'pink' | 'blue', Variants>;

/*
 * CONTEXT
 * - Problem      : 복구 화면의 배경 재사용으로 회원가입 캐릭터 위치가 어긋났다.
 * - Why          : 최신 회원가입 프레임의 위치와 카드 전용 스크롤 컨테이너를 사용한다.
 * - Alternatives : 페이지 스크롤은 배경과 캐릭터까지 이동시킨다.
 * - Trade-offs   : 공용 로그인·복구 배경에는 변경을 전파하지 않는다.
 * - Edge Case    : Motion 사용 후 언마운트 시 타임라인을 정지한다.
 */
export default function SignupBackground({
  container,
  content,
}: {
  container: RefObject<HTMLDivElement | null>;
  content: RefObject<HTMLDivElement | null>;
}) {
  const controls = useAnimationControls();
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    container,
    target: content,
    offset: ['start start', 'end end'],
  });
  useEffect(() => {
    controls.set(reducedMotion === false ? 'initial' : 'rest');
    if (reducedMotion === false) void controls.start('play');
    return () => controls.stop();
  }, [controls, reducedMotion]);
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden max-[900px]:opacity-40"
      data-signup-background
    >
      <div className="absolute left-[61.17%] top-[-34.5%] flex h-[64.31%] w-[49.72%] items-center justify-center">
        <div className="shrink-0 rotate-[31.3deg]">
          <Image
            src="/onnode/auth/imgVector4.svg"
            width={600.735}
            height={236.868}
            alt=""
            className="max-w-none"
            unoptimized
          />
        </div>
      </div>
      <div className="absolute left-[-0.47%] top-[49%]">
        <Image
          src="/onnode/auth/recovery-landscape.svg"
          width={560}
          height={415.625}
          alt=""
          unoptimized
        />
      </div>
      <div className="absolute left-[-0.47%] top-[72.89%]">
        <Image
          src="/onnode/auth/imgVector6.svg"
          width={386.766}
          height={242.524}
          alt=""
          unoptimized
        />
      </div>
      <div
        className="absolute left-[63.83%] top-[-3.62%] flex h-[14.06%] w-[9.54%] items-center justify-center"
        data-signup-character="pink"
      >
        <motion.div
          variants={signupMotion.pink}
          initial="rest"
          animate={controls}
        >
          <div className="rotate-[16.15deg] skew-x-[0.53deg]">
            <SignupCharacter
              variant="pink"
              progress={scrollYProgress}
              reducedMotion={reducedMotion !== false}
            />
          </div>
        </motion.div>
      </div>
      <div
        className="absolute left-[21.25%] top-[47.27%] flex h-[25.53%] w-[15.79%] items-center justify-center"
        data-signup-character="blue"
      >
        <motion.div
          variants={signupMotion.blue}
          initial="rest"
          animate={controls}
        >
          <div className="-rotate-[51.83deg]">
            <SignupCharacter
              variant="blue"
              progress={scrollYProgress}
              reducedMotion={reducedMotion !== false}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
