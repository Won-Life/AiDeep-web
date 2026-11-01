import TryAsset from './TryAsset';
import TryMinimap from './TryMinimap';
import TryTemplateMenu from './TryTemplateMenu';
import { ContentNode, GeneratingNode, ProjectNode, RecordingChip, TitleNode } from './TryNodes';

/* 시안의 캔버스(736×600) 좌표를 그대로 둔다. 장식용 그림이라 값으로 박아 둔다. */
const CONNECTORS = [
  { left: 190, top: 242, width: 60, height: 2 }, // 프로젝트 → 타이틀
  { left: 421, top: 241, width: 49, height: 2 }, // 타이틀 → 분기
  { left: 468, top: 125, width: 2, height: 210 }, // 세로
  { left: 468, top: 124, width: 22, height: 2 },
  { left: 468, top: 194, width: 22, height: 2 },
  { left: 468, top: 264, width: 22, height: 2 },
  { left: 468, top: 334, width: 22, height: 2 },
] as const;

/** 체험 화면 오른쪽 캔버스: 프로젝트 → 타이틀 → 콘텐츠가 이어진 모습. 동작은 없다. */
export default function TryNodeCanvas() {
  return (
    <div
      role="img"
      aria-label="프로젝트, 타이틀, 콘텐츠 노드가 이어진 On:Node 캔버스 예시"
      className="relative h-[600px] w-[736px] overflow-hidden rounded-[16px] border border-[var(--landing-divider)] bg-white"
    >
      {CONNECTORS.map((line) => (
        <div key={`${line.left}-${line.top}`} className="absolute bg-[var(--landing-primary-deep)]" style={line} />
      ))}
      <TryAsset name="handle.svg" width={12.6} height={12.6} className="absolute top-[236px] left-[190px]" />

      <ProjectNode left={55} top={189} label="OS" />
      <TitleNode left={247.38} top={215} label="260923 오늘 강의" />
      <RecordingChip left={276} top={281} label="회의 녹음 시작" />
      <ContentNode left={491} top={104} label="프로세스 스케줄링" />
      <ContentNode left={491} top={173} label="강의 슬라이드" />
      <ContentNode left={491} top={244} label="판서사진" />
      <GeneratingNode left={491} top={314} label="노드 생성 중..." />
      <TryTemplateMenu left={195} top={335} />

      <p className="absolute top-[23px] left-[23px] rounded-full bg-[var(--landing-text)] px-[14px] py-2 text-[12px] leading-[1.5] font-medium whitespace-nowrap text-white">
        + 로 노드를 추가하고, 노드를 눌러 내용을 편집해 보세요
      </p>

      <TryMinimap left={554} top={461} />
    </div>
  );
}
