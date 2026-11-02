import TryAsset from './TryAsset';
import TryMinimap from './TryMinimap';
import { ContentNode, GeneratingNode, ProjectNode, RecordingChip, TitleNode } from './TryNodes';
import type { DemoData } from './tryDemoState';
import { formatClock, type RecordPhase, type RecordingFrame } from './tryRecording';

/* 시안의 캔버스(736×600) 좌표를 그대로 둔다. 장식용 그림이라 값으로 박아 둔다. */
const POP = 'landing-pop';

/** 콘텐츠 노드를 놓는 칸의 위쪽 좌표. 연결선은 노드 위쪽에서 21px 아래에 붙는다. */
const CONTENT_TOPS = [104, 173, 244, 314, 384] as const;
const STUB_OFFSET = 21;
const BRANCH_X = 468;
const TITLE_LINE_Y = 241;

type Line = { left: number; top: number; width: number; height: number };

/** 보이는 노드만큼의 연결선. 타이틀 → 분기점 → 칸마다 짧은 가지 */
function connectorsOf({ project, title }: DemoData, count: number): Line[] {
  const lines: Line[] = [];
  if (project && title) lines.push({ left: 190, top: 242, width: 60, height: 2 }); // 프로젝트 → 타이틀
  if (!title || count === 0) return lines;

  const stubYs = CONTENT_TOPS.slice(0, count).map((top) => top + STUB_OFFSET);
  const top = stubYs[0];
  const bottom = Math.max(stubYs[stubYs.length - 1], TITLE_LINE_Y);
  lines.push({ left: 421, top: TITLE_LINE_Y, width: 49, height: 2 }); // 타이틀 → 분기
  lines.push({ left: BRANCH_X, top, width: 2, height: bottom - top });
  stubYs.forEach((y) => lines.push({ left: BRANCH_X, top: y - 1, width: 22, height: 2 }));
  return lines;
}

type TryNodeCanvasProps = {
  data: DemoData;
  phase: RecordPhase;
  /** 샘플 재생 중·끝난 뒤의 장면. 재생 전에는 null */
  frame: RecordingFrame | null;
  onRecord: () => void;
};

function chipLabel(phase: RecordPhase, frame: RecordingFrame | null): string {
  if (!frame) return '회의 녹음 시작';
  return `${phase === 'done' ? '녹음 끝' : '녹음 중'} ${formatClock(frame.seconds)}`;
}

/**
 * 체험 화면 오른쪽 캔버스: 입력한 이름대로 프로젝트 → 타이틀 → 콘텐츠 노드가 이어지고,
 * 녹음 칩을 누르면 샘플 대사가 자막으로 나오며 그 아래에 노드가 더해진다.
 */
export default function TryNodeCanvas({ data, phase, frame, onRecord }: TryNodeCanvasProps) {
  const { project, title } = data;
  const items = [
    ...data.contents.map((label) => ({ label, state: 'confirmed' as const })),
    ...(frame?.nodes ?? []),
  ];
  const labels = items.map((item) => item.label);

  return (
    <div className="relative h-[600px] w-[736px] overflow-hidden rounded-[16px] border border-[var(--landing-divider)] bg-white">
      <div
        role="img"
        aria-label={
          project
            ? `프로젝트 ${project}${title ? `, 타이틀 ${title}` : ''}${labels.length ? `, 콘텐츠 ${labels.join(', ')}` : ''} 노드가 이어진 On:Node 캔버스`
            : '아직 노드가 없는 On:Node 캔버스'
        }
        className="absolute inset-0"
      >
      {connectorsOf(data, items.length).map((line) => (
        <div key={`${line.left}-${line.top}`} className="absolute bg-[var(--landing-primary-deep)]" style={line} />
      ))}

      {project ? <TryAsset name="handle.svg" width={12.6} height={12.6} className="absolute top-[236px] left-[190px]" /> : null}
      {project ? <ProjectNode key={project} left={55} top={189} label={project} className={POP} /> : null}
      {title ? <TitleNode left={247.38} top={215} label={title} className={POP} /> : null}
      {items.map(({ label, state }, index) =>
        state === 'generating' ? (
          <GeneratingNode key={`${index}-${state}`} left={491} top={CONTENT_TOPS[index]} label="노드 생성 중..." className={POP} />
        ) : (
          <ContentNode key={`${index}-${label}`} left={491} top={CONTENT_TOPS[index]} label={label} className={POP} />
        ),
      )}

      {project ? null : (
        <p className="absolute inset-0 flex items-center justify-center text-[14px] leading-[1.5] text-[var(--landing-input-placeholder)]">
          왼쪽 1단계에서 프로젝트 노드를 만들어 보세요
        </p>
      )}

      <p className="absolute top-[23px] left-[23px] rounded-full bg-[var(--landing-text)] px-[14px] py-2 text-[12px] leading-[1.5] font-medium whitespace-nowrap text-white">
        + 로 노드를 추가하고, 노드를 눌러 내용을 편집해 보세요
      </p>

      {project ? <TryMinimap left={554} top={461} /> : null}
      </div>

      {title ? (
        <RecordingChip
          left={276}
          top={281}
          label={chipLabel(phase, frame)}
          className={POP}
          onClick={phase === 'idle' ? onRecord : undefined}
        />
      ) : null}

      <div aria-live="polite" className="absolute bottom-[23px] left-[23px] max-w-[380px]">
        {frame?.caption ? (
          <p key={frame.caption.text} className="landing-pop rounded-[10px] bg-[var(--landing-text)] px-4 py-[10px] text-[14px] leading-[1.5] text-white">
            <span className="block text-[11px] font-medium text-white/70">{frame.caption.speaker}</span>
            {frame.caption.text}
          </p>
        ) : null}
      </div>
    </div>
  );
}
