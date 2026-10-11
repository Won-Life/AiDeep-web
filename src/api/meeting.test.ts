import { describe, expect, it } from 'vitest';
import { toServerBotType } from './meeting';

describe('toServerBotType', () => {
  it('maps the screen platforms to the server Bottype enum', () => {
    expect(toServerBotType('ZOOM')).toBe('ZOOM');
    expect(toServerBotType('GOOGLE_MEET')).toBe('GOOGLE');
  });
});
