'use client';

import { useState } from 'react';
import { useAuthSession } from '@/features/auth/useAuthSession';
import LoginScreen from '@/features/auth/LoginScreen';
import SignupScreen from '@/features/auth/SignupScreen';

export default function LoginPage() {
  const checking = useAuthSession();
  const [signup, setSignup] = useState(false);
  return signup ? (
    <SignupScreen checking={checking} onBack={() => setSignup(false)} />
  ) : (
    <LoginScreen checking={checking} onSignup={() => setSignup(true)} />
  );
}
