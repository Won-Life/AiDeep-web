import TryAsset from './TryAsset';

/* 체험 캔버스에 놓는 노드 그림들. 좌표는 부모(캔버스)에서 준다. */

type Pos = { left: number; top: number };

/** 프로젝트 노드(폴더 모양) */
export function ProjectNode({ left, top, label }: Pos & { label: string }) {
  return (
    <div className="absolute" style={{ left, top, width: 140, height: 107.2 }}>
      <div className="absolute top-0 left-0 h-[9.655px] w-[52.138px] rounded-tl-[22.4px] rounded-tr-[10.752px] bg-white" />
      <div className="absolute top-[8.69px] left-0 h-[98.483px] w-[140px] overflow-hidden rounded-tr-[8.96px] rounded-br-[8.96px] rounded-bl-[8.96px] bg-white">
        <p className="absolute top-[32.51px] left-[49.49px] font-[Pretendard] text-[28.672px] leading-[normal] font-bold tracking-[0.5734px] whitespace-nowrap text-[var(--landing-node-text)]">
          {label}
        </p>
      </div>
      <div className="absolute top-[3.53px] left-[4.77px] h-[10.888px] w-[41.572px] rounded-tl-[8.064px] rounded-tr-[8.064px] bg-[rgb(var(--ds-main-blue))]" />
    </div>
  );
}

/** 타이틀 노드(알약 모양, 양쪽 연결점 포함) */
export function TitleNode({ left, top, label }: Pos & { label: string }) {
  return (
    <div className="absolute" style={{ left, top, width: 166.73, height: 52.2 }}>
      <div className="absolute top-[6.62px] left-0 h-[45.573px] w-[166.732px] rounded-[20.857px] border-[4.171px] border-white bg-[rgb(var(--ds-main-blue))]" />
      <div className="absolute top-0 left-[17.14px] h-[10.004px] w-[31.123px] rounded-tl-[8.343px] rounded-tr-[8.343px] bg-white" />
      <p className="absolute top-[21.69px] left-[44.68px] w-[89.899px] font-[Pretendard] text-[10.846px] leading-[normal] font-semibold text-white">
        {label}
      </p>
      <TryAsset name="handle.svg" width={12.6} height={12.6} className="absolute top-[22.18px] -left-[10.38px]" />
      <TryAsset name="handle.svg" width={12.6} height={12.6} className="absolute top-[22.18px] left-[163.02px]" />
    </div>
  );
}

/** 콘텐츠 노드(오른쪽이 뾰족한 화살표 모양) */
export function ContentNode({ left, top, label }: Pos & { label: string }) {
  return (
    <div className="absolute" style={{ left, top, width: 184, height: 45.3 }}>
      <TryAsset name="content-node.svg" width={181.783} height={45.3} className="absolute top-0 left-0 h-full w-[98.87%]" />
      <p className="absolute top-[17px] left-[20.88px] font-[Pretendard] text-[11px] leading-[normal] font-bold whitespace-nowrap text-white">
        {label}
      </p>
    </div>
  );
}

/** 만드는 중인 콘텐츠 노드(점선 + 자물쇠) */
export function GeneratingNode({ left, top, label }: Pos & { label: string }) {
  return (
    <div className="absolute" style={{ left, top, width: 183.86, height: 45.3 }}>
      <TryAsset name="generating-node.png" width={181.783} height={45.3} className="absolute top-0 left-0 h-full w-[98.87%]" />
      <TryAsset name="lock.svg" width={18} height={18} className="absolute top-[13.63px] left-[135.4px]" />
      <p className="absolute top-[18px] left-[21px] font-[Pretendard] text-[11px] leading-[normal] font-bold whitespace-nowrap text-[rgb(var(--ds-main-blue))]">
        {label}
      </p>
    </div>
  );
}

/** "회의 녹음 시작" 칩 */
export function RecordingChip({ left, top, label }: Pos & { label: string }) {
  return (
    <div
      className="absolute flex items-center gap-[6px] rounded-full border border-[var(--landing-danger)] bg-[var(--landing-danger-bg)] py-[5px] pr-3 pl-[10px]"
      style={{ left, top }}
    >
      <TryAsset name="rec-dot.svg" width={10} height={10} />
      <p className="text-[11px] leading-[1.5] font-medium whitespace-nowrap text-[var(--landing-danger)]">{label}</p>
    </div>
  );
}
