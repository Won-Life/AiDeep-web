'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuthSession } from '@/features/auth/useAuthSession';
import LoginScreen from '@/features/auth/LoginScreen';
import SignupScreen from '@/features/auth/SignupScreen';
import SessionLoadError from '@/features/auth/SessionLoadError';

function LoginPageContent() {
  const { checking, loadFailed, retry } = useAuthSession();
  const [signup, setSignup] = useState(useSearchParams().get('mode') === 'signup');
  if (loadFailed) return <SessionLoadError onRetry={retry} />;
  return signup ? (
    <SignupScreen checking={checking} onBack={() => setSignup(false)} />
  ) : (
    <LoginScreen checking={checking} onSignup={() => setSignup(true)} />
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageContent />
    </Suspense>
  );
}
