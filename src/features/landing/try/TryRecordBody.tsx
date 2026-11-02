import { progressLabel, type RecordPhase, type RecordingFrame } from './tryRecording';

type TryRecordBodyProps = {
  phase: RecordPhase;
  frame: RecordingFrame | null;
  onStart: () => void;
};

/** 4단계 본문: 샘플 회의 재생 버튼, 재생 중에는 진행 상황을 보여 준다. */
export default function TryRecordBody({ phase, frame, onStart }: TryRecordBodyProps) {
  if (phase === 'idle' || !frame) {
    return (
      <button
        type="button"
        onClick={onStart}
        className="rounded-[8px] bg-[var(--landing-primary)] px-4 py-[9px] text-[13px] leading-[1.5] font-medium whitespace-nowrap text-white transition-colors hover:bg-[var(--landing-primary-deep)]"
      >
        ▶ 샘플 회의 재생
      </button>
    );
  }

  return (
    <p className="text-[12px] leading-[1.5] text-[var(--landing-text-muted)]">
      {phase === 'done' ? '재생이 끝났어요' : progressLabel(frame)}
    </p>
  );
}
