'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { login, signup, sendEmailCode, verifyEmailCode } from '@/api/auth';
import { createWorkspace } from '@/api/workspace';
import { getMe } from '@/api/user';
import { ApiError } from '@/api/types';

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
    'h-[56px] w-full rounded-[8px] border border-gray-700 bg-surface px-[16px] text-[16px] text-foreground outline-none placeholder:text-muted focus:border-main transition-colors';

  const labelClass = 'text-[16px] font-semibold text-foreground pl-[8px]';

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-[700px] rounded-[16px] bg-background px-[24px] py-[88px] shadow-[0px_0px_4px_0px_rgba(44,44,44,0.25)]">

        {/* 로그인 */}
        {mode === 'login' && (
          <>
            <h1 className="mb-[64px] text-center text-[36px] font-bold leading-[48px] text-foreground">
              AIDeep 로그인
            </h1>

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

                <div className="border-t border-border" />

                <button
                  type="button"
                  onClick={() => { setMode('signup'); setError(''); }}
                  className="h-[56px] w-full rounded-[8px] border border-main bg-background text-[18px] font-semibold text-main hover:bg-main-5 transition-colors"
                >
                  회원가입
                </button>
              </div>
            </form>
          </>
        )}

        {/* 회원가입 */}
        {mode === 'signup' && (
          <>
            <h1 className="mb-[64px] text-center text-[36px] font-bold leading-[48px] text-foreground">
              AIDeep 회원가입
            </h1>

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

                <div className="border-t border-border" />

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
    </div>
  );
}
