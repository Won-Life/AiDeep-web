'use client';

import { useEffect, useState } from 'react';
import {
  EMPTY_DEMO,
  STEP_ORDER,
  applyStepInput,
  isStepUnlocked,
  nextOpenStep,
  type DemoData,
} from './tryDemoState';
import { RECORDING_MS, recordingFrame, type RecordPhase } from './tryRecording';

const RECORD_INDEX = STEP_ORDER.indexOf('record');
const TICK_MS = 200;

/** 직접 체험의 상태: 입력한 노드 이름들, 지금 펼쳐진 단계(없으면 -1), 사용자가 이미 만졌는지, 샘플 녹음 재생 */
export function useTryDemo() {
  const [data, setData] = useState<DemoData>(EMPTY_DEMO);
  const [openIndex, setOpenIndex] = useState(0);
  const [touched, setTouched] = useState(false);
  const [phase, setPhase] = useState<RecordPhase>('idle');
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (phase !== 'playing') return;
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const ms = Date.now() - startedAt;
      setElapsed(Math.min(ms, RECORDING_MS));
      if (ms >= RECORDING_MS) setPhase('done');
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [phase]);

  const playing = phase === 'playing';

  /** 입력을 반영했으면 true. 반영되면 다음 단계가 열린다. 재생 중에는 막고, 끝난 뒤 고치면 재생 장면은 거둔다 */
  const submit = (index: number, raw: string) => {
    if (playing) return false;
    const next = applyStepInput(data, STEP_ORDER[index], raw);
    if (next === data) return false;
    setData(next);
    setPhase('idle');
    setOpenIndex(nextOpenStep(data, next, index));
    setTouched(true);
    return true;
  };

  /** 아코디언은 한 번에 하나만 열린다. 열린 단계를 다시 누르면 접힌다 */
  const toggle = (index: number) => {
    if (playing || !isStepUnlocked(data, index)) return;
    setOpenIndex((current) => (current === index ? -1 : index));
    setTouched(true);
  };

  /** 샘플 회의 재생을 처음부터 시작한다. 녹음 칩과 4단계 버튼, 다시 해 보기가 부른다 */
  const startRecording = () => {
    if (playing || !isStepUnlocked(data, RECORD_INDEX)) return;
    setElapsed(0);
    setPhase('playing');
    setOpenIndex(RECORD_INDEX);
    setTouched(true);
  };

  const reset = () => {
    setData(EMPTY_DEMO);
    setOpenIndex(0);
    setTouched(false);
    setPhase('idle');
    setElapsed(0);
  };

  const frame = phase === 'idle' ? null : recordingFrame(elapsed);

  return { data, openIndex, touched, phase, frame, submit, toggle, startRecording, reset };
}

export type TryDemo = ReturnType<typeof useTryDemo>;
