import { useEffect, useState } from "react";

/** 경과 초를 `mm:ss`(1시간 이상이면 `h:mm:ss`)로 만든다. */
export function formatElapsed(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const two = (value: number) => String(value).padStart(2, "0");
  return h > 0 ? `${h}:${two(m)}:${two(s)}` : `${two(m)}:${two(s)}`;
}

/** ISO 시각부터 지금까지의 초. 해석할 수 없으면 0. */
export function secondsSince(startIso: string, now: number): number {
  const start = Date.parse(startIso);
  if (Number.isNaN(start)) return 0;
  return Math.max(0, Math.floor((now - start) / 1000));
}

/** 1초마다 갱신되는 `mm:ss`. `active`가 false면 갱신하지 않는다. */
export function useElapsedLabel(startIso: string, active: boolean): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    // 첫 갱신은 1초 뒤다. 활성이 되기 전 오래된 now는 secondsSince가 0으로 보정한다.
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);
  return formatElapsed(secondsSince(startIso, now));
}
