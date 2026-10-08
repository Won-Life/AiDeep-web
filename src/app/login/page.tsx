'use client';

import { useState } from 'react';
import { useAuthSession } from '@/features/auth/useAuthSession';
import LoginScreen from '@/features/auth/LoginScreen';
import LegacySignup from '@/features/auth/LegacySignup';

export default function LoginPage() {
  const checking = useAuthSession();
  const [signup, setSignup] = useState(false);
  return signup ? <LegacySignup onBack={() => setSignup(false)} /> : <LoginScreen checking={checking} onSignup={() => setSignup(true)} />;
}
