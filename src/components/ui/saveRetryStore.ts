/*
 * CONTEXT
 * - Problem      : 오프라인 편집의 실패 안내에 실제 재시도 동작이 없다.
 * - Why          : 원래 호출의 Promise를 유지하는 순차 큐로 성공 응답을 기존 로컬 상태 처리에 돌려준다.
 * - Alternatives : 요청을 복제해서 재전송하면 생성 중복과 응답 누락이 생기므로 대기 중인 호출을 이어간다.
 * - Trade-offs   : 대기 데이터는 현재 탭의 메모리에만 보관하며 실패한 항목은 후속 저장보다 먼저 처리한다.
 * - Edge Case    : 재시도 연타는 단일 실행으로 합치고 복구 불가 오류는 호출자에게 반환한다.
 */
export function createSaveQueue() {
  type Entry = { run: () => Promise<unknown>; resolve: (value: unknown) => void; reject: (error: unknown) => void; retryable: (error: unknown) => boolean };
  const entries: Entry[] = [];
  const listeners = new Set<() => void>();
  let running = false;
  const emit = () => listeners.forEach((listener) => listener());
  return {
    getCount: () => entries.length,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    enqueue<T>(run: () => Promise<T>, retryable: (error: unknown) => boolean): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        entries.push({ run, resolve: (value) => resolve(value as T), reject, retryable });
        emit();
      });
    },
    async retry() {
      if (running) return;
      running = true;
      try {
        while (entries.length) {
          const entry = entries[0];
          try { entry.resolve(await entry.run()); }
          catch (error) {
            if (entry.retryable(error)) break;
            entry.reject(error);
          }
          entries.shift();
          emit();
        }
      } finally { running = false; }
    },
  };
}

export const pendingSaves = createSaveQueue();
