'use client';

import PasswordRequestPanel from './PasswordRequestPanel';
import PasswordResetPanel from './PasswordResetPanel';

export default function PasswordRecoveryScreen({ reset = false }: { reset?: boolean }) {
  return reset ? <PasswordResetPanel /> : <PasswordRequestPanel />;
}
