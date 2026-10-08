'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMe } from '@/api/user';
import { getRefreshToken } from '@/api/client';

export function useAuthSession() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    let active = true;
    // Do not allow a new login to race with boot-time refresh rotation.
    const session = getRefreshToken() ? getMe() : Promise.reject(null);
    session.then(() => { if (active) router.replace('/workspace'); })
      .catch(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [router]);
  return checking;
}
