'use client';
import { useState } from 'react';
import HelpMenu from './HelpMenu';
import GraphOnboardingModal from './GraphOnboardingModal';

import { useId } from 'react';

/*
 * CONTEXT
 * - Problem      : 작은 로딩 표시가 전체 캔버스의 고정 그래프 스켈레톤 시안과 다르다.
 * - Why          : 실제 캔버스 배경과 시안에서 추출한 #C0CEFF를 사용하고 마스크 안의 밝은 띠를 처음부터 이동시킨다.
 * - Alternatives : 화면 밖에서 시작하는 약한 띠는 짧은 로딩 중 보이지 않아 음수 지연과 선명한 중심부를 사용한다.
 * - Trade-offs   : 사용자 요청에 따라 로딩 중에만 반복 애니메이션을 사용하고 그래프 자체는 움직이지 않는다.
 * - Edge Case    : 인스턴스별 SVG ID 충돌을 막고 reduced-motion에서는 정적인 모양과 상태 문구를 유지한다.
 */
export default function WorkspaceLoading() {
  const [guideOpen, setGuideOpen] = useState(false);
  const id = useId();
  const graphId = `${id}-graph`;
  const maskId = `${id}-mask`;
  const waveId = `${id}-wave`;

  return (
    <div className="workspace-graph-loading relative h-full w-full overflow-hidden" aria-busy="true">
      {/* 로딩 중에도 같은 위치에서 그래프 안내를 열 수 있다. */}
      <div className="absolute top-[21px] right-4 z-40 sm:right-8">
        <HelpMenu onOpenGuide={() => setGuideOpen(true)} />
      </div>
      <GraphOnboardingModal open={guideOpen} onClose={() => setGuideOpen(false)} />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1208 800" preserveAspectRatio="xMidYMid meet" fill="none" aria-hidden="true">
        <defs>
          <g id={graphId}>
            <g stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none">
              <path d="M40 464H158Q170 464 170 476V553Q170 565 158 565H40M170 513H190" />
              <path d="M377 513H440Q452 513 452 501V384Q452 372 464 372H488" />
              <path d="M645 372H706Q718 372 718 360V264Q718 252 730 252H790" />
              <path d="M995 252H1023Q1035 252 1035 240V174Q1035 162 1047 162H1090" />
              <path d="M1035 226H1090M995 252H1023Q1035 252 1035 264V344Q1035 356 1047 356H1090M1035 291H1090" />
            </g>
            <g fill="currentColor">
              <rect x="-100" y="441" width="165" height="46" rx="5" />
              <rect x="-100" y="541" width="165" height="46" rx="5" />
              <path d="M202 486H312Q314 478 321 478H341Q348 478 350 486A28 28 0 0 1 349 542H202A28 28 0 0 1 202 486Z" />
              <path d="M488 316Q488 304 500 304H535Q545 304 547 314H633Q645 314 645 326V413Q645 425 633 425H500Q488 425 488 413Z" />
              <path d="M818 225H811Q813 217 821 217H839Q847 217 849 225H963A28 28 0 0 1 963 281H818A28 28 0 0 1 818 225Z" />
              <rect x="1072" y="137" width="200" height="46" rx="5" />
              <rect x="1072" y="202" width="200" height="46" rx="5" />
              <rect x="1072" y="268" width="200" height="46" rx="5" />
              <rect x="1072" y="333" width="200" height="46" rx="5" />
              <circle cx="170" cy="513" r="8" /><circle cx="377" cy="513" r="8" />
              <circle cx="488" cy="372" r="8" /><circle cx="645" cy="372" r="8" />
              <circle cx="786" cy="252" r="8" /><circle cx="995" cy="252" r="8" />
            </g>
          </g>
          <mask id={maskId} x="0" y="0" width="1208" height="800" maskUnits="userSpaceOnUse" style={{ maskType: 'alpha' }}>
            <use href={`#${graphId}`} color="white" />
          </mask>
          <linearGradient id={waveId} x1="0" y1="0" x2="100%" y2="0">
            <stop offset="0" stopColor="white" stopOpacity="0" />
            <stop offset="0.35" stopColor="white" stopOpacity="0.9" />
            <stop offset="0.65" stopColor="white" stopOpacity="0.9" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>
        <use href={`#${graphId}`} className="workspace-graph-loading-shape" />
        <g mask={`url(#${maskId})`}>
          <path className="workspace-graph-loading-wave" d="M-80-40H200C80 240 320 440 200 840H-80C40 440-200 240-80-40Z" fill={`url(#${waveId})`} />
        </g>
      </svg>
      <p role="status" aria-live="polite" className="absolute inset-x-4 bottom-[78px] text-center text-[13px] leading-5 font-medium text-[#748DFD]">
        그래프를 불러오는 중이에요...
      </p>
      <div aria-hidden="true" className="absolute right-8 bottom-[34px] hidden h-[112px] w-[155px] overflow-hidden rounded-[20px] border border-[#8B9FFF] bg-white/80 min-[600px]:block">
        <svg viewBox="0 0 1208 800" className="h-[92px] w-full" fill="none">
          <use href={`#${graphId}`} color="#A9BAFF" />
          <rect x="250" y="170" width="580" height="390" rx="65" stroke="#748DFD" strokeWidth="8" fill="#748DFD" fillOpacity="0.08" />
        </svg>
        <div className="h-5 border-t border-[#A9BAFF] bg-[#EEF2FF]" />
      </div>
    </div>
  );
}
