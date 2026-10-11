import Link from 'next/link';
import AuthLayout from '@/features/auth/AuthLayout';
import { RecoveryLinkButton } from '@/features/auth/RecoveryParts';

/*
 * CONTEXT
 * - Problem      : 없는 주소로 들어오면 Next 기본 영문 404가 보인다.
 * - Why          : Figma "404 페이지를 찾을 수 없어요" 시안을 인증 화면과 같은 카드·배경으로 보여 준다.
 * - Alternatives : 기본 404 유지 → 브랜드·언어가 어긋난다.
 * - Trade-offs   : 로그인 상태를 확인하지 않는다. 홈(/)이 로그인 여부에 따라 워크스페이스나 로그인으로 보낸다.
 * - Edge Case    : 서버 컴포넌트라 상태 없이 링크 두 개만 둔다.
 */
export default function NotFound() {
  return (
    <AuthLayout recovery asleep>
      <h1 className="mt-[34px] text-center text-[28px] font-bold leading-8 text-[var(--onnode-text)]">404</h1>
      <p className="mt-[2px] text-center text-[16px] font-bold leading-6 text-[var(--onnode-text)]">페이지를 찾을 수 없어요</p>
      <p className="mt-[22px] text-center text-[13px] font-medium leading-[18px]">
        요청하신 페이지가 삭제되었거나 주소가 변경되었어요.
        <br />
        아래 버튼으로 다시 시작해보세요.
      </p>
      <RecoveryLinkButton href="/" className="mt-[30px]">홈으로 돌아가기</RecoveryLinkButton>
      <Link
        href="/login"
        className="mt-[14px] inline-flex h-[42px] w-full items-center justify-center rounded-[20px] border border-[var(--onnode-primary)] px-6 text-[13px] font-semibold text-[var(--onnode-text)] transition-colors hover:bg-[var(--onnode-primary-200)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--onnode-primary-700)]"
      >
        로그인으로 이동
      </Link>
    </AuthLayout>
  );
}
