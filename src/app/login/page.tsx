'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login, signup, sendEmailCode, verifyEmailCode } from '@/api/auth';
import { createWorkspace } from '@/api/workspace';
import { ApiError } from '@/api/types';

type AuthMode = 'login' | 'signup';
type SignupStep = 'form' | 'verify';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('login');
  const [signupStep, setSignupStep] = useState<SignupStep>('form');

  // form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [verifyCode, setVerifyCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setPhone('');
    setVerifyCode('');
    setError('');
    setMessage('');
    setSignupStep('form');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login({ email, password });
      router.push('/graph');
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
      await sendEmailCode({ email });
      setSignupStep('verify');
      setMessage('인증번호가 이메일로 발송되었습니다.');
    } catch (err) {
      setError(err instanceof ApiError ? err.reason : '인증번호 발송에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // 이메일 인증 확인
      await verifyEmailCode({ email, code: Number(verifyCode) });
      // 회원가입
      await signup({ email, password, name, phone });

      // TODO: 임시 처리 - 백엔드에서 회원가입 시 기본 워크스페이스 자동 생성으로 교체 예정
      const loginResult = await login({ email, password });
      if (loginResult) {
        await createWorkspace({ title: '내 워크스페이스', role: 'OWNER' });
      }

      setMessage('회원가입이 완료되었습니다! 로그인해주세요.');
      setMode('login');
      resetForm();
    } catch (err) {
      setError(err instanceof ApiError ? err.reason : '회원가입에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    resetForm();
  };

  const inputClass =
    'h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-main';

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-[400px] px-6">
        {/* Logo */}
        <div className="mb-10 text-center">
          <h1 className="text-[28px] font-bold tracking-tight text-foreground">
            Ai<span className="text-main">Deep</span>
          </h1>
          <p className="mt-2 text-sm text-muted">
            {mode === 'login'
              ? '워크스페이스에 로그인하세요'
              : '새 계정을 만들어보세요'}
          </p>
        </div>

        {/* Login Form */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="typo-cap1 text-foreground">
                이메일
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="typo-cap1 text-foreground">
                비밀번호
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                required
                className={inputClass}
              />
            </div>

            {error && <p className="text-xs text-text-red">{error}</p>}
            {message && <p className="text-xs text-text-green">{message}</p>}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 h-11 rounded-lg bg-main font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? '처리 중...' : '로그인'}
            </button>
          </form>
        )}

        {/* Signup Form */}
        {mode === 'signup' && (
          <form onSubmit={handleSignup} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className="typo-cap1 text-foreground">
                이름
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="홍길동"
                required
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="signup-email" className="typo-cap1 text-foreground">
                이메일
              </label>
              <div className="flex gap-2">
                <input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={signupStep === 'verify'}
                  className={`${inputClass} flex-1 disabled:opacity-50`}
                />
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={loading || !email || signupStep === 'verify'}
                  className="h-11 shrink-0 rounded-lg border border-main px-3 text-xs font-semibold text-main transition-opacity hover:opacity-80 disabled:opacity-40"
                >
                  인증요청
                </button>
              </div>
            </div>

            {signupStep === 'verify' && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="code" className="typo-cap1 text-foreground">
                  인증번호
                </label>
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                  placeholder="인증번호 6자리"
                  required
                  className={inputClass}
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="phone" className="typo-cap1 text-foreground">
                전화번호
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01012345678"
                required
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="signup-password" className="typo-cap1 text-foreground">
                비밀번호
              </label>
              <input
                id="signup-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                required
                minLength={6}
                className={inputClass}
              />
            </div>

            {error && <p className="text-xs text-text-red">{error}</p>}
            {message && <p className="text-xs text-text-green">{message}</p>}

            <button
              type="submit"
              disabled={loading || signupStep !== 'verify'}
              className="mt-2 h-11 rounded-lg bg-main font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? '처리 중...' : '회원가입'}
            </button>
          </form>
        )}

        {/* Toggle */}
        <p className="mt-6 text-center text-sm text-muted">
          {mode === 'login' ? '계정이 없으신가요?' : '이미 계정이 있으신가요?'}{' '}
          <button
            type="button"
            onClick={toggleMode}
            className="font-semibold text-main hover:underline"
          >
            {mode === 'login' ? '회원가입' : '로그인'}
          </button>
        </p>
      </div>
    </div>
  );
}
