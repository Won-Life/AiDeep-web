'use client';

import { useEffect } from 'react';

// ponytail: 임시로 /를 그래프 온보딩 페이지로 즉시 보냄. 원래 getMe() 기반
// 인증 분기(/workspace ↔ /login)로 되돌리려면 이 파일의 git history 참고.
const GRAPH_ONBOARDING_URL = 'https://won-life.github.io/Aideep_graph_onboard/';

export default function Page() {
  useEffect(() => {
    window.location.replace(GRAPH_ONBOARDING_URL);
  }, []);

  return (
    <div className="flex h-screen w-screen items-center justify-center text-[14px] text-muted">
      확인 중...
    </div>
  );
}
