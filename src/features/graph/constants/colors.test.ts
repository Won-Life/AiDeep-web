import { describe, expect, it } from 'vitest';
import { FIGMA_NODE_COLORS, isDarkNodeBackground } from './colors';

describe('isDarkNodeBackground', () => {
  it('uses light placeholders for darker title and content palette tones', () => {
    expect(isDarkNodeBackground(FIGMA_NODE_COLORS.blue.deep)).toBe(true);
    expect(isDarkNodeBackground(FIGMA_NODE_COLORS.blue.light)).toBe(true);
    expect(isDarkNodeBackground(FIGMA_NODE_COLORS.purple.deep)).toBe(true);
    expect(isDarkNodeBackground(FIGMA_NODE_COLORS.red.deep)).toBe(true);
  });
  it('keeps gray placeholders on pale and white backgrounds', () => {
    expect(isDarkNodeBackground('#ffffff')).toBe(false);
    expect(isDarkNodeBackground(FIGMA_NODE_COLORS.yellow.deep)).toBe(false);
    expect(isDarkNodeBackground(FIGMA_NODE_COLORS.orange.light)).toBe(false);
    expect(isDarkNodeBackground(FIGMA_NODE_COLORS.purple.light)).toBe(false);
  });
  it('supports stored short hex and RGB values', () => {
    expect(isDarkNodeBackground('#234')).toBe(true);
    expect(isDarkNodeBackground('rgb(32, 48, 64)')).toBe(true);
    expect(isDarkNodeBackground('rgb(240, 240, 240)')).toBe(false);
  });
  it('falls back safely for missing or unsupported colors', () => {
    expect(isDarkNodeBackground(undefined)).toBe(false);
    expect(isDarkNodeBackground('rgb(var(--ds-sub-blue))')).toBe(false);
    expect(isDarkNodeBackground('#oops')).toBe(false);
    expect(isDarkNodeBackground('rgb(999, 0, 0)')).toBe(false);
  });
});
