'use client';

import Image from 'next/image';
import { useEffect } from 'react';
import { useAnimationControls, useReducedMotion } from 'motion/react';
import AuthBackground from '@/features/auth/AuthBackground';
import AuthMotionPiece from '@/features/auth/AuthMotionPiece';
import { completionMotion } from './completionMotion';

const baseAssets = {
  top: '/onnode/onboarding/8fb22.svg', landscape: '/onnode/onboarding/6336c.svg',
  hill: '/onnode/onboarding/d47e8.svg', line: '/onnode/onboarding/e2ff8.svg',
  organize: '/onnode/onboarding/35a92.svg', record: '/onnode/onboarding/7a899.svg',
  summarize: '/onnode/onboarding/d8a86.svg',
};

export default function OnboardingBackground({ purpose = false }: { purpose?: boolean }) {
  return <AuthBackground recovery={false} assets={{ ...baseAssets,
    blue: purpose ? '/onnode/onboarding/8da70.svg' : '/onnode/onboarding/9d833.svg',
    pink: purpose ? '/onnode/onboarding/766d2.svg' : '/onnode/onboarding/eced9.svg',
  }} />;
}

export function OnboardingCompletionBackground() {
  const controls = useAnimationControls();
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    controls.stop();
    controls.set(reducedMotion === false ? 'initial' : 'rest');
    if (reducedMotion === false) void controls.start('play');
    return () => controls.stop();
  }, [controls, reducedMotion]);
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden max-[900px]:opacity-40">
      <div className="absolute left-[61.17%] top-[-34.5%] flex h-[64.32%] w-[49.72%] items-center justify-center">
        <div className="shrink-0 rotate-[31.3deg]"><Image src="/onnode/onboarding/8fb22.svg" width={600.735} height={236.868} alt="" unoptimized /></div>
      </div>
      <div className="absolute left-[-0.47%] top-[49%]"><Image src="/onnode/onboarding/a522d.svg" width={560} height={415.624} alt="" unoptimized /></div>
      <div className="absolute left-[-0.47%] top-[72.89%]"><Image src="/onnode/onboarding/e2ff8.svg" width={386.766} height={242.524} alt="" unoptimized /></div>
      <div className="absolute left-[calc(50%-368px)] top-[calc(50%-22px)] flex h-[204.24px] w-[202.11px] items-center justify-center">
        <AuthMotionPiece config={completionMotion.blue} controls={controls} nodeId="424:42340">
          <div className="-rotate-[51.83deg]"><Image src="/onnode/onboarding/95cac.svg" width={151.078} height={138.271} alt="" unoptimized /></div>
        </AuthMotionPiece>
      </div>
      <div className="absolute left-[calc(50%+159px)] top-[calc(50%-290px)] flex h-[112.56px] w-[122.11px] items-center justify-center">
        <AuthMotionPiece config={completionMotion.pink} controls={controls} nodeId="424:42348">
          <div className="rotate-[16.15deg] skew-x-[0.53deg]"><Image src="/onnode/onboarding/bde8c.svg" width={102.683} height={87.1845} alt="" unoptimized /></div>
        </AuthMotionPiece>
      </div>
    </div>
  );
}
