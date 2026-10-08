import { describe, expect, it } from 'vitest';
import { buildOnboardingRequest, isNicknameValid, toggleMeetingPlatform } from './onboardingRules';

describe('온보딩 입력 규칙', () => {
  it.each(['', '가', 'abcdefghijklmnop'])('길이가 맞지 않는 이름을 거부한다: %s', (name) => {
    expect(isNicknameValid(name)).toBe(false);
  });
  it.each(['가나', '  김영민  ', 'abcdefghijkl', '😀😀'])('유효한 이름을 허용한다: %s', (name) => {
    expect(isNicknameValid(name)).toBe(true);
  });
  it('회의 방식 선택과 해제를 원본 배열 변경 없이 처리한다', () => {
    const original = toggleMeetingPlatform([], 'ZOOM');
    const selected = toggleMeetingPlatform(original, 'GOOGLE_MEET');
    expect(selected).toEqual(['ZOOM', 'GOOGLE_MEET']);
    expect(toggleMeetingPlatform(selected, 'ZOOM')).toEqual(['GOOGLE_MEET']);
    expect(original).toEqual(['ZOOM']);
  });
  it('서버 계약의 필드명과 enum으로 저장 요청을 만든다', () => {
    expect(buildOnboardingRequest('  김영민  ', 'TEAM_PROJECT', ['ZOOM', 'ZOOM', 'GOOGLE_MEET']))
      .toEqual({ userName: '김영민', usageProposal: 'TEAM_PROJECT', meeting: ['ZOOM', 'GOOGLE_MEET'] });
  });
  it('건너뛴 답변과 빈 닉네임은 null/빈 배열로 유지한다', () => {
    expect(buildOnboardingRequest(' ', null, []))
      .toEqual({ userName: null, usageProposal: null, meeting: [] });
  });
});
