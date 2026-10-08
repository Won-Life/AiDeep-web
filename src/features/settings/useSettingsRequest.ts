'use client';
import { useEffect, useRef, useState } from 'react';
import { ApiError } from '@/api/types';

/*
 * CONTEXT
 * - Problem      : 중복 저장과 화면 종료 후 늦은 응답 처리를 막아야 한다.
 * - Why          : 요청 잠금/수명/오류를 하나의 훅에서 관리한다.
 * - Alternatives : 각 모달의 try/catch 복제 → 서로 다른 오류/중복 요청 정책.
 * - Trade-offs   : 동시 설정 변경은 한 건으로 제한한다.
 * - Edge Case    : 실패 시 입력은 보존하고 성공 callback은 호출하지 않는다.
 */
export function useSettingsRequest() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const lock = useRef(false);
  const alive = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  async function run<T>(
    request: () => Promise<T>,
    onSuccess: (value: T) => void,
  ) {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setError('');
    setErrorCode('');
    try {
      const result = await request();
      if (alive.current) onSuccess(result);
    } catch (failure) {
      if (alive.current) {
        setError(
          failure instanceof ApiError
            ? failure.reason
            : '처리하지 못했어요. 다시 시도해주세요.',
        );
        setErrorCode(failure instanceof ApiError ? failure.errorCode : '');
      }
    } finally {
      lock.current = false;
      if (alive.current) setPending(false);
    }
  }
  return {
    pending,
    error,
    errorCode,
    run,
    clearError: () => {
      setError('');
      setErrorCode('');
    },
  };
}
