'use client';

import {
  motion,
  type useAnimationControls,
  type TargetAndTransition,
  type Variants,
} from 'motion/react';
import type { ReactNode } from 'react';
import { loginMotion, errorMotion } from './authMotion';

/*
 * CONTEXT
 * - Problem      : 배경의 여러 요소가 같은 타임라인을 공유한다.
 * - Why          : 공통 controls로 시작·정지를 맞추고 각 요소의 원본 값을 유지한다.
 * - Alternatives : 각 요소의 독립 effect → 타임라인 전환 시 시작 시점이 어긋난다.
 * - Trade-offs   : 위치 wrapper와 모션 wrapper를 분리한다.
 * - Edge Case    : reduced motion에서는 말풍선도 숨기지 않고 정적으로 표시한다.
 */
export default function AuthMotionPiece({
  config,
  controls,
  children,
  nodeId,
  restRotate = 0,
}: {
  config:
    | (typeof loginMotion)[keyof typeof loginMotion]
    | (typeof errorMotion)[keyof typeof errorMotion];
  controls: ReturnType<typeof useAnimationControls>;
  children: ReactNode;
  nodeId: string;
  restRotate?: number;
}) {
  const variants: Variants = {
    initial: config.initial,
    play: {
      ...config.animate,
      transition: config.transition,
    } as TargetAndTransition,
    rest: { opacity: 1, x: 0, y: 0, rotate: restRotate, scaleX: 1, scaleY: 1 },
  };
  return (
    <motion.div
      data-node-id={nodeId}
      initial="rest"
      animate={controls}
      variants={variants}
    >
      {children}
    </motion.div>
  );
}
