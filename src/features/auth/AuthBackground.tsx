'use client';

import Image from 'next/image';
import { useEffect } from 'react';
import { useAnimationControls, useReducedMotion } from 'motion/react';
import AuthMotionPiece from './AuthMotionPiece';
import { loginMotion, errorMotion } from './authMotion';

export default function AuthBackground({
  recovery,
  error = false,
}: {
  recovery: boolean;
  error?: boolean;
}) {
  const controls = useAnimationControls();
  const reducedMotion = useReducedMotion();
  const config = error ? errorMotion : loginMotion;
  const ids = error
    ? ['401:1458', '401:1446', '401:1498', '401:1399', '401:1437']
    : ['401:1244', '401:1231', '401:1284', '401:1184', '401:1222'];
  useEffect(() => {
    controls.stop();
    if (recovery || reducedMotion !== false) {
      controls.set('rest');
    } else {
      controls.set('initial');
      void controls.start('play');
    }
    return () => controls.stop();
  }, [controls, recovery, reducedMotion, error]);
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden max-[900px]:opacity-40"
    >
      <div className="absolute left-[59.92%] top-[-35.13%] flex h-[64.32%] w-[49.72%] items-center justify-center">
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
      {recovery ? (
        <div className="absolute left-[-0.47%] top-[49%]">
          <Image
            src="/onnode/auth/recovery-landscape.svg"
            width={560}
            height={415.625}
            alt=""
            unoptimized
          />
        </div>
      ) : (
        <>
          <div className="absolute left-[-0.47%] top-[49%]">
            <Image
              src="/onnode/auth/imgVector2.svg"
              width={260.916}
              height={274.315}
              alt=""
              unoptimized
            />
          </div>
          <div className="absolute left-[0.08%] top-[68%]">
            <Image
              src="/onnode/auth/imgVector3.svg"
              width={553}
              height={263.613}
              alt=""
              unoptimized
            />
          </div>
        </>
      )}
      <div className="absolute left-[-0.47%] top-[72.89%]">
        <Image
          src="/onnode/auth/imgVector6.svg"
          width={386.766}
          height={242.524}
          alt=""
          unoptimized
        />
      </div>
      {recovery ? (
        <>
          <div className="absolute left-[calc(50%-370px)] top-[calc(50%+10px)] flex h-[204px] w-[202px] items-center justify-center">
            <div className="shrink-0 -rotate-[51.83deg]">
              <Image
                src="/onnode/auth/recovery-blue.svg"
                width={151.078}
                height={138.271}
                alt=""
                unoptimized
              />
            </div>
          </div>
          <div className="absolute left-[calc(50%+158px)] top-[calc(50%-318px)] flex h-[112px] w-[122px] items-center justify-center">
            <div className="shrink-0 rotate-[16.15deg]">
              <Image
                src="/onnode/auth/recovery-pink.svg"
                width={102.683}
                height={87.1845}
                alt=""
                unoptimized
              />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="absolute left-[6.64%] top-[63.46%]">
            <AuthMotionPiece
              config={config.blue}
              controls={controls}
              nodeId={ids[0]}
            >
              <Image
                src="/onnode/auth/imgGroup320.svg"
                width={149.915}
                height={131.48}
                alt=""
                unoptimized
              />
            </AuthMotionPiece>
          </div>
          <div className="absolute left-[87.03%] top-[91.13%] flex h-[14.06%] w-[9.54%] items-center justify-center">
            <AuthMotionPiece
              config={config.pink}
              controls={controls}
              nodeId={ids[1]}
              restRotate={16.153}
            >
              <div className="skew-x-[0.53deg]">
                <Image
                  src="/onnode/auth/imgGroup29.svg"
                  width={102.683}
                  height={87.1845}
                  alt=""
                  className="max-w-none"
                  unoptimized
                />
              </div>
            </AuthMotionPiece>
          </div>
          <div className="absolute left-[9.22%] top-[56%]">
            <AuthMotionPiece
              config={config.organize}
              controls={controls}
              nodeId={ids[2]}
            >
              <Image
                src="/onnode/auth/imgVector5.svg"
                width={97.3888}
                height={54.4}
                alt=""
                className="-scale-x-100"
                unoptimized
              />
              <span className="absolute left-[16px] top-[13px] text-[12px] font-semibold text-[var(--onnode-primary-300)]">
                Organize
              </span>
            </AuthMotionPiece>
          </div>
          <div className="absolute left-[92.42%] top-[73.62%]">
            <AuthMotionPiece
              config={config.record}
              controls={controls}
              nodeId={ids[3]}
            >
              <Image
                src="/onnode/auth/imgVector.svg"
                width={77.718}
                height={41.6026}
                alt=""
                unoptimized
              />
              <span className="absolute left-[18px] top-[8px] text-[12px] font-semibold text-[var(--onnode-primary-300)]">
                Record
              </span>
            </AuthMotionPiece>
          </div>
          <div className="absolute left-[88.98%] top-[83%]">
            <AuthMotionPiece
              config={config.summarize}
              controls={controls}
              nodeId={ids[4]}
            >
              <Image
                src="/onnode/auth/imgVector1.svg"
                width={96.1236}
                height={41.6026}
                alt=""
                unoptimized
              />
              <span className="absolute left-[14px] top-[8px] text-[12px] font-semibold text-[var(--onnode-primary-300)]">
                Summarize
              </span>
            </AuthMotionPiece>
          </div>
        </>
      )}
    </div>
  );
}
