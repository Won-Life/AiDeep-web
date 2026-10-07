'use client';

import { Suspense } from 'react';
import PasswordRecoveryScreen from '@/features/auth/PasswordRecoveryScreen';

export default function PasswordResetPage() {
  return (
    <Suspense>
      <PasswordRecoveryScreen reset />
    </Suspense>
  );
}
