'use client';

import EntrySplash from './EntrySplash';
import { useLandingEntry } from './useLandingEntry';

/** 로그인한 사용자는 워크스페이스로 보내고, 확인하는 동안 스플래시로 랜딩을 가린다. */
export default function EntryGate() {
  const { checking } = useLandingEntry();
  return checking ? <EntrySplash /> : null;
}
