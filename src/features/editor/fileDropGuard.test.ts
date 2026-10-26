import { describe, expect, it, vi } from 'vitest';
import { blockLockedFileDrop } from './fileDropGuard';

function drag(types = ['Files']) {
  return { dataTransfer: { types, dropEffect: 'copy' }, preventDefault: vi.fn(), stopPropagation: vi.fn() };
}

describe('잠긴 본문의 파일 드롭 차단', () => {
  it('잠금 시 native 기본 동작과 상위 전파를 모두 막는다', () => {
    const event = drag();
    expect(blockLockedFileDrop(event, false)).toBe(true);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(event.stopPropagation).toHaveBeenCalledOnce();
    expect(event.dataTransfer.dropEffect).toBe('none');
  });
  it('편집 가능한 파일 드롭은 기존 Lexical 명령에 맡긴다', () => {
    const event = drag();
    expect(blockLockedFileDrop(event, true)).toBe(false);
    expect(event.preventDefault).not.toHaveBeenCalled();
  });
  it('일반 텍스트 드래그에는 개입하지 않는다', () => {
    const event = drag(['text/plain']);
    expect(blockLockedFileDrop(event, false)).toBe(false);
    expect(event.stopPropagation).not.toHaveBeenCalled();
  });
  it('dataTransfer가 없는 이벤트는 무시한다', () => {
    const event = { dataTransfer: null, preventDefault: vi.fn(), stopPropagation: vi.fn() };
    expect(blockLockedFileDrop(event, false)).toBe(false);
    expect(event.preventDefault).not.toHaveBeenCalled();
  });
  it('같은 드래그에서도 잠금 전환 후에는 차단한다', () => {
    const event = drag();
    expect(blockLockedFileDrop(event, true)).toBe(false);
    expect(blockLockedFileDrop(event, false)).toBe(true);
  });
});
