'use client';

import { useFirstProject } from './useFirstProject';

const STEPS = ['프로젝트 만들기', '타이틀 추가'] as const;

function StepBadge({ step }: { step: string }) {
  return (
    <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-gray-700 text-[11px]">
      {step}
    </span>
  );
}

/*
 * CONTEXT
 * - Problem      : 워크스페이스가 하나도 없는 사용자는 캔버스를 열 수 없어 스피너만 계속 보인다.
 * - Why          : 캔버스의 빈 상태(G2)와 같은 모양으로 첫 프로젝트 만들기를 안내하고 버튼으로 시작하게 한다.
 * - Alternatives : 완전한 빈 화면 → 무엇을 해야 하는지 알 수 없다.
 * - Trade-offs   : 노드만 없는 워크스페이스는 캔버스가 같은 빈 상태를 이미 보여주므로 여기서 다루지 않는다.
 * - Edge Case    : 워크스페이스만 만들어지고 노드 생성이 실패하면 재시도에서 같은 워크스페이스를 쓴다.
 */
export default function FirstProjectPrompt({ onCreated }: { onCreated: () => void }) {
  const { busy, error, create } = useFirstProject(onCreated);
  return (
    <div className="flex h-full w-full flex-col items-center justify-center px-6 text-center">
      <span
        className="rounded-full border-[1.5px] border-dashed border-gray-700 px-7 py-2.5 text-[13px] text-gray-500"
        aria-hidden="true"
      >
        프로젝트
      </span>
      <h2 className="mt-5 text-xl font-bold text-foreground">첫 프로젝트 노드를 만들어보세요</h2>
      <p className="mt-2 text-[13.5px] text-muted">
        과목이나 팀 프로젝트 이름으로 시작하면 좋아요. 예: 운영체제, 캡스톤
      </p>
      <button
        type="button"
        onClick={() => void create()}
        disabled={busy}
        style={{ backgroundColor: 'rgb(var(--ds-main-blue))' }}
        className="mt-6 rounded-[20px] px-6 py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-50"
      >
        {busy ? '만드는 중...' : '+ 프로젝트 노드 만들기'}
      </button>
      {error && <p role="alert" className="mt-3 text-[12.5px] text-red-500">{error}</p>}
      <div className="mt-8 flex items-center gap-2 text-[12.5px] text-muted">
        {STEPS.map((label, index) => (
          <span key={label} className="flex items-center gap-2">
            <span className="flex items-center gap-1.5">
              <StepBadge step={String(index + 1)} />
              {label}
            </span>
            <span aria-hidden="true">→</span>
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <StepBadge step="3" />
          타이틀 위{' '}
          <span className="whitespace-nowrap font-semibold text-foreground">
            <span className="text-red-500">●</span> 회의 녹음
          </span>{' '}
          으로 회의 시작
        </span>
      </div>
    </div>
  );
}
