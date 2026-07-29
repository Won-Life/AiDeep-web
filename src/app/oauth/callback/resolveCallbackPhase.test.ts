import { describe, it, expect } from 'vitest';
import { resolveCallbackPhase } from './resolveCallbackPhase';

const phaseOf = (query: string) => resolveCallbackPhase(new URLSearchParams(query));

describe('resolveCallbackPhase', () => {
  it('login: 토큰 두 개가 모두 있으면 로그인으로 판정한다', () => {
    expect(phaseOf('kind=login&accessToken=a&refreshToken=r')).toEqual({
      status: 'login',
      accessToken: 'a',
      refreshToken: 'r',
    });
  });

  it('login: 토큰이 하나라도 빠지면 에러로 떨어진다', () => {
    expect(phaseOf('kind=login&accessToken=a').status).toBe('error');
  });

  it('signup_required: ticket을 실어 가입 화면으로 보낸다', () => {
    expect(phaseOf('kind=signup_required&ticket=t')).toEqual({
      status: 'signup',
      ticket: 't',
    });
  });

  it('signup_required: ticket이 없으면 에러로 떨어진다', () => {
    expect(phaseOf('kind=signup_required').status).toBe('error');
  });

  it('linked: 추가 파라미터 없이 연동 완료로 판정한다', () => {
    expect(phaseOf('kind=linked')).toEqual({ status: 'linked' });
  });

  it('error: 알려진 reason은 해당 안내 문구로 바꾼다', () => {
    const phase = phaseOf('kind=error&reason=email_conflict');
    expect(phase.status).toBe('error');
    expect(phase).toHaveProperty('message', expect.stringContaining('이미 가입된 이메일'));
  });

  it('error: 모르는 reason과 빈 쿼리는 같은 폴백 문구를 쓴다', () => {
    const unknown = phaseOf('kind=error&reason=made_up_code');
    expect(unknown).toEqual(phaseOf(''));
    expect(unknown).toHaveProperty('message', expect.stringContaining('구글 로그인에 실패'));
  });
});
