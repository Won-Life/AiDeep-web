'use client';

import { useState } from 'react';
import {
  EMPTY_DEMO,
  STEP_ORDER,
  applyStepInput,
  isStepUnlocked,
  nextOpenStep,
  type DemoData,
} from './tryDemoState';

/** 직접 체험의 상태: 입력한 노드 이름들, 지금 펼쳐진 단계(없으면 -1), 사용자가 이미 만졌는지 */
export function useTryDemo() {
  const [data, setData] = useState<DemoData>(EMPTY_DEMO);
  const [openIndex, setOpenIndex] = useState(0);
  const [touched, setTouched] = useState(false);

  /** 입력을 반영했으면 true. 반영되면 다음 단계가 열린다 */
  const submit = (index: number, raw: string) => {
    const next = applyStepInput(data, STEP_ORDER[index], raw);
    if (next === data) return false;
    setData(next);
    setOpenIndex(nextOpenStep(data, next, index));
    setTouched(true);
    return true;
  };

  /** 아코디언은 한 번에 하나만 열린다. 열린 단계를 다시 누르면 접힌다 */
  const toggle = (index: number) => {
    if (!isStepUnlocked(data, index)) return;
    setOpenIndex((current) => (current === index ? -1 : index));
    setTouched(true);
  };

  const reset = () => {
    setData(EMPTY_DEMO);
    setOpenIndex(0);
    setTouched(false);
  };

  return { data, openIndex, touched, submit, toggle, reset };
}

export type TryDemo = ReturnType<typeof useTryDemo>;
