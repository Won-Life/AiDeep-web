import { progressLabel, type RecordPhase, type RecordingFrame } from './tryRecording';

type TryRecordBodyProps = {
  phase: RecordPhase;
  frame: RecordingFrame | null;
  onStart: () => void;
};

/** 4단계 본문: 샘플 회의 재생 버튼, 재생 중에는 진행 상황을 보여 준다. */
export default function TryRecordBody({ phase, frame, onStart }: TryRecordBodyProps) {
  const playing = phase === 'playing' && frame;

  return (
    <>
      {playing ? (
        <p className="text-[12px] leading-[1.5] text-[var(--landing-text-muted)]">{progressLabel(frame)}</p>
      ) : (
        <button
          type="button"
          onClick={onStart}
          className="rounded-[8px] bg-[var(--landing-primary)] px-4 py-[9px] text-[13px] leading-[1.5] font-medium whitespace-nowrap text-white transition-colors hover:bg-[var(--landing-primary-deep)]"
        >
          {phase === 'done' ? '▶ 다시 재생' : '▶ 샘플 회의 재생'}
        </button>
      )}
    </>
  );
}
