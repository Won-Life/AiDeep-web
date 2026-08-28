import { describe, expect, it } from 'vitest';
import { buildExportFilename } from './exportFilename';

describe('buildExportFilename', () => {
  it('연월일-시분을 두 자리로 채워 파일명을 만든다', () => {
    expect(buildExportFilename(new Date(2026, 7, 29, 14, 32))).toBe('aideep-답변-20260829-1432.png');
  });

  it('한 자리 월·일·시·분도 0으로 채운다', () => {
    expect(buildExportFilename(new Date(2026, 0, 5, 9, 7))).toBe('aideep-답변-20260105-0907.png');
  });

  it('자정은 0000으로 찍힌다', () => {
    expect(buildExportFilename(new Date(2026, 11, 31, 0, 0))).toBe('aideep-답변-20261231-0000.png');
  });
});
