/*
 * CONTEXT
 * - Problem      : 저장 실패(네트워크 등)를 사용자에게 알릴 토스트가 없었다(Figma L3).
 *                  토스트 라이브러리도 없다.
 * - Why          : React 비의존 순수 스토어로 분리 — axios 인터셉터(client.ts, 비컴포넌트)가
 *                  showToast를 import해도 React를 끌어오지 않는다. 표시는 ToastHost.tsx.
 * - Alternatives : 라이브러리(sonner 등) 도입 — 토스트 하나에 의존성 추가는 과함, 기각.
 * - Trade-offs   : 간단한 pub/sub라 우선순위·중복제거 없음. 같은 메시지 연타 시 쌓일 수 있어
 *                  동일 메시지 1초 내 재발행은 무시한다.
 * - Edge Case    : SSR에는 리스너가 없어 no-op. 자동 소멸 타이머는 showToast 시점에 건다.
 */

export type ToastItem = { id: number; message: string };

let toasts: ToastItem[] = [];
const listeners = new Set<() => void>();
let nextId = 1;
let lastMessage = '';
let lastAt = 0;

function emit() {
  listeners.forEach((l) => l());
}

/** 토스트 표시 (4초 후 자동 소멸). 동일 메시지 1초 내 재발행은 무시. */
export function showToast(message: string): void {
  const now = Date.now();
  if (message === lastMessage && now - lastAt < 1000) return;
  lastMessage = message;
  lastAt = now;

  const id = nextId++;
  toasts = [...toasts, { id, message }];
  emit();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, 4000);
}

export function subscribeToasts(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getToasts(): ToastItem[] {
  return toasts;
}
