'use client';

/*
 * CONTEXT
 * - Problem      : 화면의 채팅 버블을 그대로 캡처하면 좁은 말풍선 스크린샷이 나온다.
 *                  공유용 PNG로 쓰려면 별도 치수·타이포로 짠 카드를 따로 찍어야 한다.
 * - Why          : 카드 마운트는 호출부(AiChatPanel)가, 캡처만 이 훅이 맡는다. 훅이 포털까지
 *                  소유하면 "언제 렌더됐는지"를 호출부와 훅이 이중으로 관리하게 된다.
 * - Alternatives : (1) 버블 DOM 직접 캡처 — 결과물이 잘린 스크린샷이라 기각
 *                  (2) Canvas 2D 직접 렌더 — 목록·표·코드블록 레이아웃을 손으로 짜야 해 기각
 *                  (3) 서버 렌더(satori) — 답변 텍스트 왕복과 무거운 의존성으로 기각
 * - Trade-offs   : html-to-image 의존성 1개를 얻는 대신 마크다운이 그대로 살아난다.
 * - Edge Case    : 백그라운드 탭에서는 requestAnimationFrame이 멈춘다. 이 훅의 프레임 대기뿐
 *                  아니라 html-to-image 내부(util.js createImage)도 rAF를 기다리므로,
 *                  타임아웃이 없으면 "만드는 중…" 상태에 영구히 갇힌다.
 */

import { toPng } from 'html-to-image';
import { useState } from 'react';
import { buildExportFilename } from './exportFilename';
import { buildFontEmbedCss } from './fontEmbedCss';

export type ExportState = 'idle' | 'working' | 'saved' | 'error';

/** 에러 문구를 잠깐 보여준 뒤 idle로 되돌리기까지의 시간. */
export const ERROR_DISPLAY_MS = 1500;

/** 저장 완료 문구를 보여준 뒤 idle로 되돌리기까지의 시간. */
export const SAVED_DISPLAY_MS = 1500;

/** 백그라운드 탭에서 rAF가 멈췄을 때 프레임 대기를 대신 풀어주는 시간. */
const FRAME_FALLBACK_MS = 50;

/**
 * 내보내기 전체 제한 시간. 탭이 가려진 동안은 캡처가 진행되지 않으므로, 이 시간 안에
 * 돌아오지 않으면 실패로 처리하고 다시 시도하게 한다.
 */
const EXPORT_TIMEOUT_MS = 30_000;

const nextFrame = () =>
  new Promise<void>((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    requestAnimationFrame(done);
    setTimeout(done, FRAME_FALLBACK_MS);
  });

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    work,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`내보내기가 ${ms}ms 안에 끝나지 않았습니다`)), ms);
    }),
  ]);
}

function triggerDownload(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

async function capture(node: HTMLElement) {
  // 웹폰트가 아직 안 붙은 상태로 찍히면 한글이 대체 폰트로 나온다.
  await document.fonts.ready;
  // 카드의 자기 높이 측정(useLayoutEffect)이 끝난 다음 프레임에 찍는다.
  await nextFrame();
  await nextFrame();

  // 문서의 @font-face를 전부 심으면 한글 조각 수백 개까지 받아와 사실상 멈춘다.
  const fontEmbedCSS = await buildFontEmbedCss(node.innerText);
  return toPng(node, { pixelRatio: 2, cacheBust: false, fontEmbedCSS });
}

/**
 * 화면 밖에 마운트된 카드 DOM을 PNG로 떠서 내려받는다.
 * 카드 마운트·언마운트는 호출부(AiChatPanel)가 맡고, 여기서는 캡처만 책임진다.
 */
export function useAnswerImageExport() {
  const [state, setState] = useState<ExportState>('idle');

  const exportNode = async (node: HTMLElement, exportedAt: Date) => {
    setState('working');
    try {
      const dataUrl = await withTimeout(capture(node), EXPORT_TIMEOUT_MS);
      triggerDownload(dataUrl, buildExportFilename(exportedAt));
      setState('saved');
      return true;
    } catch (error) {
      console.error('[chat] 답변 이미지 내보내기 실패', error);
      setState('error');
      return false;
    }
  };

  const resetState = () => setState('idle');

  return { state, exportNode, resetState };
}
