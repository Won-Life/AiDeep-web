'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMe } from '@/api/user';
import { getRefreshToken } from '@/api/client';
import { getAuthDestination } from '@/features/onboarding/onboardingEntry';

export function useAuthSession() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    let active = true;
    // Do not allow a new login to race with boot-time refresh rotation.
    const session = getRefreshToken() ? getMe() : Promise.reject(null);
    session.then((user) => { if (active) router.replace(getAuthDestination(user)); })
      .catch(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [router]);
  return checking;
}
