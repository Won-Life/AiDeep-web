import TryAsset from './TryAsset';

const BAR_TEXT =
  'absolute top-[3.55px] -translate-x-1/2 text-center font-[Pretendard] text-[8px] leading-[normal] font-medium text-[var(--landing-ink)]';

/** 캔버스 오른쪽 아래 미니맵과 확대/축소 막대 그림 */
export default function TryMinimap({ left, top }: { left: number; top: number }) {
  return (
    <div className="absolute" style={{ left, top, width: 155, height: 112 }}>
      <div className="absolute top-0 left-0 h-[110px] w-[155px] overflow-hidden rounded-[20px] border border-[var(--landing-primary-border)] bg-white">
        <TryAsset name="minimap-a.svg" width={94.3} height={42.9} className="absolute inset-[42.68%_-7.37%_18.29%_46.54%] size-full" />
        <TryAsset name="minimap-b.svg" width={94.3} height={42.9} className="absolute inset-[4.46%_46.08%_56.51%_-6.91%] size-full" />
        <div className="absolute top-[23px] left-8 h-[49px] w-[73px] rounded-[10px] border border-[var(--landing-primary-mid)] bg-[var(--landing-tint)] mix-blend-multiply" />
      </div>
      <div className="absolute top-[92.45px] left-0 h-[19.238px] w-[155px] rounded-b-[20px] border border-[var(--landing-primary-border)] bg-[var(--landing-tint)]">
        <p className={`${BAR_TEXT} left-[79.22px] w-[25px]`}>100%</p>
        <p className={`${BAR_TEXT} left-[20.97px]`}>-</p>
        <p className={`${BAR_TEXT} left-[138.32px]`}>+</p>
      </div>
    </div>
  );
}
