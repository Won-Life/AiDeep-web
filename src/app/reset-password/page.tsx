'use client';

import { Suspense } from 'react';
import PasswordRecoveryScreen from '@/features/auth/PasswordRecoveryScreen';

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <PasswordRecoveryScreen reset />
    </Suspense>
  );
}
