'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuthSession } from '@/features/auth/useAuthSession';
import LoginScreen from '@/features/auth/LoginScreen';
import SignupScreen from '@/features/auth/SignupScreen';

function LoginPageContent() {
  const checking = useAuthSession();
  const [signup, setSignup] = useState(useSearchParams().get('mode') === 'signup');
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
