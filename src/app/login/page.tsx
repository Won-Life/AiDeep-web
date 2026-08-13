'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { login, signup, sendEmailCode, verifyEmailCode } from '@/api/auth';
import { createWorkspace } from '@/api/workspace';
import { getMe } from '@/api/user';
import { ApiError } from '@/api/types';
import { TERMS_URL, PRIVACY_URL } from '@/lib/legalLinks';
import LoginBackground from './LoginBackground';

type AuthMode = 'login' | 'signup';

const EyeIcon = ({ open }: { open: boolean }) =>
  open ? (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 4C5.5 4 2 10 2 10s3.5 6 8 6 8-6 8-6-3.5-6-8-6Z" stroke="rgb(var(--muted))" strokeWidth="1.5" />
      <circle cx="10" cy="10" r="2.5" stroke="rgb(var(--muted))" strokeWidth="1.5" />
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M3 3l14 14M10 4C5.5 4 2 10 2 10s1.2 2.1 3.3 3.7M10 16c4.5 0 8-6 8-6s-1.2-2.1-3.3-3.7" stroke="rgb(var(--muted))" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M7.6 7.6a2.5 2.5 0 0 0 3.5 3.5" stroke="rgb(var(--muted))" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );

// 구글 브랜드 로고 — 지정된 브랜드 색이라 디자인 토큰으로 대체하지 않는다
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
    <path d="M19.6 10.23c0-.7-.06-1.37-.18-2H10v3.79h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.23c1.89-1.74 2.98-4.3 2.98-7.31Z" fill="#4285F4" />
    <path d="M10 20c2.7 0 4.96-.9 6.61-2.43l-3.23-2.5c-.9.6-2.04.95-3.38.95-2.6 0-4.8-1.75-5.59-4.11H1.08v2.58A10 10 0 0 0 10 20Z" fill="#34A853" />
    <path d="M4.41 11.9a6 6 0 0 1 0-3.83V5.49H1.08a10 10 0 0 0 0 9.02l3.33-2.6Z" fill="#FBBC05" />
    <path d="M10 3.96c1.47 0 2.79.51 3.83 1.5l2.86-2.86C14.96.99 12.7 0 10 0A10 10 0 0 0 1.08 5.49l3.33 2.58C5.2 5.71 7.4 3.96 10 3.96Z" fill="#EA4335" />
  </svg>
);

// AiDeep 노드 로고 마크 — 타이틀 위 브랜드 표식 (장식)
const LogoMark = () => (
  <svg width="44" height="32" viewBox="0 0 44 32" fill="none" aria-hidden="true" className="mx-auto">
    <path d="M12 16 L26 8 M26 8 L36 20" stroke="rgb(var(--ds-gray-700))" strokeWidth="1.5" />
    <circle cx="12" cy="16" r="5" fill="rgb(var(--ds-main))" opacity="0.45" />
    <circle cx="26" cy="8" r="7" fill="rgb(var(--ds-main))" />
    <circle cx="36" cy="20" r="4.5" fill="rgb(var(--ds-gray-500))" opacity="0.6" />
  </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('login');

  // 로그인 폼
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // 회원가입 폼
  const [signupName, setSignupName] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirm, setShowSignupConfirm] = useState(false);

  // 이메일 인증
  const [verifyCode, setVerifyCode] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // ponytail: /가 하던 "로그인 상태면 /workspace로" 역할을 임시로 이관.
    // getMe()가 401을 받으면 client.ts의 refresh queue가 자동으로 access/refresh
    // 토큰 유효성을 검증한다 — 갱신 성공 시 재시도해 resolve(그러면 아래 workspace
    // 이동), 실패 시 자체적으로 이 페이지에 남는다(이미 /login이라 추가 이동 불필요).
    getMe()
      .then(() => router.replace('/workspace'))
      .catch(() => {});
  }, [router]);

  useEffect(() => {
    if (timerSeconds <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setTimerSeconds((s) => s - 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerSeconds]);

  const formatTimer = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const resetSignupForm = () => {
    setSignupName('');
    setSignupPhone('');
    setSignupEmail('');
    setSignupPassword('');
    setSignupConfirm('');
    setVerifyCode('');
    setEmailSent(false);
    setEmailVerified(false);
    setTimerSeconds(0);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login({ email, password });
      router.push('/workspace');
    } catch (err) {
      setError(err instanceof ApiError ? err.reason : '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async () => {
    setError('');
    setLoading(true);
    try {
      await sendEmailCode({ email: signupEmail });
      setEmailSent(true);
      setEmailVerified(false);
      setVerifyCode('');
      setTimerSeconds(180);
    } catch (err) {
      setError(err instanceof ApiError ? err.reason : '인증번호 발송에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setError('');
    setLoading(true);
    try {
      await verifyEmailCode({ email: signupEmail, code: Number(verifyCode) });
      setEmailVerified(true);
      setTimerSeconds(0);
    } catch (err) {
      setError(err instanceof ApiError ? err.reason : '인증번호가 올바르지 않습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupPassword !== signupConfirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signup({ email: signupEmail, password: signupPassword, name: signupName, phone: signupPhone });

      // TODO: 임시 처리 - 백엔드에서 회원가입 시 기본 워크스페이스 자동 생성으로 교체 예정
      const loginResult = await login({ email: signupEmail, password: signupPassword });
      if (loginResult) {
        // 이미 로그인 완료 — 워크스페이스 생성이 실패해도 회원가입 실패로 되돌리지 않고
        // 인증된 사용자를 워크스페이스로 보낸다 (partial-success 방치 방지)
        try {
          await createWorkspace({ title: '내 워크스페이스', role: 'OWNER' });
        } catch {
          // ponytail: 서버가 회원가입 시 기본 워크스페이스 자동 생성으로 교체되면 이 블록째 삭제
        }
        router.push('/workspace');
        return;
      }

      // 자동 로그인 실패 시에만 로그인 폼으로 폴백 (이메일 프리필)
      setMode('login');
      resetSignupForm();
      setEmail(signupEmail);
    } catch (err) {
      setError(err instanceof ApiError ? err.reason : '회원가입에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'h-[56px] w-full rounded-[8px] border border-gray-700 bg-background/60 px-[16px] text-[16px] text-foreground outline-none placeholder:text-muted focus:border-main transition-colors';

  const labelClass = 'text-[16px] font-semibold text-foreground pl-[8px]';

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-[16px] bg-background p-6">
      <LoginBackground />
      <div className="relative z-10 w-full max-w-[480px] rounded-[20px] border border-border/60 bg-background/70 px-[32px] py-[48px] shadow-[0px_8px_40px_0px_rgba(44,44,44,0.12)] backdrop-blur-xl">

        {/* 로그인 */}
        {mode === 'login' && (
          <>
            <LogoMark />
            <h1 className="mb-[8px] mt-[16px] text-center text-[28px] font-bold leading-[36px] text-foreground">
              AiDeep 로그인
            </h1>
            <p className="mb-[40px] text-center text-[14px] text-muted">복잡한 머리가 가벼워지는 곳</p>

            <form onSubmit={handleLogin} className="flex flex-col gap-[40px]">
              <div className="flex flex-col gap-[24px]">
                <div className="flex flex-col gap-[8px]">
                  <label htmlFor="email" className={labelClass}>이메일</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="이메일"
                    required
                    className={inputClass}
                  />
                </div>

                <div className="flex flex-col gap-[8px]">
                  <label htmlFor="password" className={labelClass}>비밀번호</label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="영문, 숫자 포함 8자 이상 입력"
                      required
                      className={`${inputClass} pr-[48px]`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-[16px] top-1/2 -translate-y-1/2"
                      tabIndex={-1}
                    >
                      <EyeIcon open={showPassword} />
                    </button>
                  </div>
                </div>
              </div>

              {error && <p className="text-[13px] text-text-red">* {error}</p>}

              <div className="flex flex-col gap-[24px]">
                <button
                  type="submit"
                  disabled={loading || !email || !password}
                  className="h-[56px] w-full rounded-[8px] bg-gray-600 text-[18px] font-semibold text-white transition-colors enabled:bg-main enabled:hover:opacity-90 disabled:cursor-not-allowed"
                >
                  {loading ? '처리 중...' : '로그인'}
                </button>

                <div className="flex items-center gap-[12px]">
                  <div className="flex-1 border-t border-border" />
                  <span className="text-[13px] text-muted">또는</span>
                  <div className="flex-1 border-t border-border" />
                </div>

                <button
                  type="button"
                  onClick={() => { setMode('signup'); setError(''); }}
                  className="h-[56px] w-full rounded-[8px] border border-main bg-background text-[18px] font-semibold text-main hover:bg-main-5 transition-colors"
                >
                  회원가입
                </button>

                {/* 구글 인증 페이지로의 이동이라 axios가 아닌 브라우저 전체 이동이어야 한다(XHR은 CORS로 차단).
                    /api/* 로 보내면 next.config.ts의 rewrites가 백엔드로 포워딩한다. */}
                <button
                  type="button"
                  onClick={() => { window.location.href = '/api/auth/google'; }}
                  className="flex h-[56px] w-full items-center justify-center gap-[8px] rounded-[8px] border border-gray-700 bg-background text-[18px] font-semibold text-foreground hover:bg-surface transition-colors"
                >
                  <GoogleIcon />
                  구글로 계속하기
                </button>
              </div>
            </form>
          </>
        )}

        {/* 회원가입 */}
        {mode === 'signup' && (
          <>
            <LogoMark />
            <h1 className="mb-[8px] mt-[16px] text-center text-[28px] font-bold leading-[36px] text-foreground">
              AiDeep 회원가입
            </h1>
            <p className="mb-[40px] text-center text-[14px] text-muted">복잡한 머리가 가벼워지는 곳</p>

            <form onSubmit={handleSignup} className="flex flex-col gap-[40px]">
              <div className="flex flex-col gap-[24px]">

                {/* 이름 */}
                <div className="flex flex-col gap-[8px]">
                  <label htmlFor="signup-name" className={labelClass}>이름</label>
                  <input
                    id="signup-name"
                    type="text"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    placeholder="이름"
                    required
                    className={inputClass}
                  />
                </div>

                {/* 전화번호 */}
                <div className="flex flex-col gap-[8px]">
                  <label htmlFor="signup-phone" className={labelClass}>전화번호</label>
                  <input
                    id="signup-phone"
                    type="tel"
                    value={signupPhone}
                    onChange={(e) => setSignupPhone(e.target.value)}
                    placeholder="01012345678"
                    required
                    className={inputClass}
                  />
                </div>

                {/* 이메일 + 인증 */}
                <div className="flex flex-col gap-[8px]">
                  <label htmlFor="signup-email" className={labelClass}>이메일</label>
                  <div className="flex gap-[16px]">
                    <input
                      id="signup-email"
                      type="email"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      placeholder="이메일"
                      required
                      disabled={emailVerified}
                      className={`${inputClass} flex-1 disabled:opacity-50`}
                    />
                    <button
                      type="button"
                      onClick={handleSendCode}
                      disabled={loading || !signupEmail || emailVerified}
                      className="h-[56px] shrink-0 rounded-[8px] bg-gray-600 px-[16px] text-[16px] font-semibold text-white transition-colors enabled:bg-main enabled:hover:opacity-80 disabled:cursor-not-allowed"
                    >
                      인증하기
                    </button>
                  </div>

                  {emailSent && !emailVerified && (
                    <div className="flex gap-[16px]">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={verifyCode}
                        onChange={(e) => setVerifyCode(e.target.value)}
                        placeholder="인증번호 입력"
                        className={`${inputClass} flex-1`}
                      />
                      <button
                        type="button"
                        onClick={handleVerifyCode}
                        disabled={loading || !verifyCode}
                        className="h-[56px] shrink-0 rounded-[8px] bg-gray-600 px-[16px] text-[16px] font-semibold text-white transition-colors enabled:bg-main enabled:hover:opacity-80 disabled:cursor-not-allowed"
                      >
                        확인
                      </button>
                    </div>
                  )}

                  {emailSent && !emailVerified && timerSeconds > 0 && (
                    <p className="pl-[8px] text-[13px] text-muted">
                      유효시간: <span className="text-main">{formatTimer(timerSeconds)}</span>
                    </p>
                  )}
                  {emailSent && !emailVerified && timerSeconds === 0 && (
                    <p className="pl-[8px] text-[13px] text-text-red">* 인증번호가 만료되었습니다. 재발송해주세요.</p>
                  )}
                  {emailVerified && (
                    <p className="pl-[8px] text-[13px] text-main">* 인증되었습니다.</p>
                  )}
                </div>

                {/* 비밀번호 */}
                <div className="flex flex-col gap-[8px]">
                  <label htmlFor="signup-password" className={labelClass}>비밀번호</label>
                  <div className="relative">
                    <input
                      id="signup-password"
                      type={showSignupPassword ? 'text' : 'password'}
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="영문, 숫자 포함 8자 이상 입력"
                      required
                      minLength={8}
                      className={`${inputClass} pr-[48px]`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword((v) => !v)}
                      className="absolute right-[16px] top-1/2 -translate-y-1/2"
                      tabIndex={-1}
                    >
                      <EyeIcon open={showSignupPassword} />
                    </button>
                  </div>
                </div>

                {/* 비밀번호 확인 */}
                <div className="flex flex-col gap-[8px]">
                  <label htmlFor="signup-confirm" className={labelClass}>비밀번호 확인</label>
                  <div className="relative">
                    <input
                      id="signup-confirm"
                      type={showSignupConfirm ? 'text' : 'password'}
                      value={signupConfirm}
                      onChange={(e) => setSignupConfirm(e.target.value)}
                      placeholder="영문, 숫자 포함 8자 이상 입력"
                      required
                      className={`${inputClass} pr-[48px]`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupConfirm((v) => !v)}
                      className="absolute right-[16px] top-1/2 -translate-y-1/2"
                      tabIndex={-1}
                    >
                      <EyeIcon open={showSignupConfirm} />
                    </button>
                  </div>
                </div>
              </div>

              {error && <p className="text-[13px] text-text-red">* {error}</p>}

              {/* 이메일 가입 경로에도 약관 고지 — 구글 가입 경로와 일관 (#206) */}
              <p className="pl-[8px] text-[13px] text-muted">
                회원가입 시{' '}
                <a
                  href={TERMS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2"
                >
                  이용약관
                </a>{' '}
                및{' '}
                <a
                  href={PRIVACY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2"
                >
                  개인정보 처리방침
                </a>
                에 동의하는 것으로 간주됩니다.
              </p>

              <div className="flex flex-col gap-[24px]">
                <button
                  type="submit"
                  disabled={
                    loading ||
                    !emailVerified ||
                    !signupName ||
                    !signupPhone ||
                    !signupPassword ||
                    !signupConfirm
                  }
                  className="h-[56px] w-full rounded-[8px] bg-gray-600 text-[18px] font-semibold text-white transition-colors enabled:bg-main enabled:hover:opacity-90 disabled:cursor-not-allowed"
                >
                  {loading ? '처리 중...' : '회원가입'}
                </button>

                <div className="flex items-center gap-[12px]">
                  <div className="flex-1 border-t border-border" />
                  <span className="text-[13px] text-muted">또는</span>
                  <div className="flex-1 border-t border-border" />
                </div>

                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(''); resetSignupForm(); }}
                  className="h-[56px] w-full rounded-[8px] border border-main bg-background text-[18px] font-semibold text-main hover:bg-main-5 transition-colors"
                >
                  로그인
                </button>
              </div>
            </form>
          </>
        )}
      </div>

      {/* 약관·개인정보처리방침 상시 접근 링크 (#206) */}
      <nav className="relative z-10 flex items-center gap-[16px] text-[13px] text-muted">
        <a
          href={TERMS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground transition-colors"
        >
          이용약관
        </a>
        <a
          href={PRIVACY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground transition-colors"
        >
          개인정보처리방침
        </a>
      </nav>
    </div>
  );
}
