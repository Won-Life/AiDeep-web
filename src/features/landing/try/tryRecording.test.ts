import { describe, expect, it } from 'vitest';
import { RECORDING_MS, SAMPLE_LINES, formatClock, progressLabel, recordingFrame } from './tryRecording';

describe('recordingFrame', () => {
  it('시작 직후에는 자막도 노드도 없다', () => {
    const frame = recordingFrame(0);
    expect(frame).toMatchObject({ caption: null, spoken: 0, nodes: [], seconds: 0 });
  });

  it('대사가 나오면 자막이 뜨고, 잠시 뒤 만드는 중 → 확정 순으로 바뀐다', () => {
    expect(recordingFrame(600).caption?.text).toBe(SAMPLE_LINES[0].text);
    expect(recordingFrame(600).nodes).toEqual([]);
    expect(recordingFrame(500 + 1300).nodes).toEqual([{ label: '결정 사항', state: 'generating' }]);
    expect(recordingFrame(500 + 2700).nodes).toEqual([{ label: '결정 사항', state: 'confirmed' }]);
  });

  it('다음 대사 전에 자막이 잠깐 비고, 노드는 대사 순서대로 쌓인다', () => {
    expect(recordingFrame(500 + 3000).caption).toBeNull();
    const labels = recordingFrame(RECORDING_MS).nodes.map((node) => node.label);
    expect(labels).toEqual(SAMPLE_LINES.map((line) => line.label));
  });

  it('끝 시각을 넘겨도 마지막 장면에 머물고, 음수는 처음으로 본다', () => {
    expect(recordingFrame(RECORDING_MS + 5000)).toEqual(recordingFrame(RECORDING_MS));
    expect(recordingFrame(-10)).toEqual(recordingFrame(0));
  });
});

describe('표시 문구', () => {
  it('시계는 분:초 두 자리다', () => {
    expect(formatClock(3)).toBe('00:03');
    expect(formatClock(65)).toBe('01:05');
  });

  it('진행 문구가 재생 단계를 따라간다', () => {
    expect(progressLabel(recordingFrame(0))).toBe('녹음을 시작했어요');
    expect(progressLabel(recordingFrame(500 + 3200 + 100))).toBe('대사 2/3 · 노드 만드는 중');
    expect(progressLabel(recordingFrame(RECORDING_MS))).toBe('노드 정리를 마쳤어요');
  });
});
