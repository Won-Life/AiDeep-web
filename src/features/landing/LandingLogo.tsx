/*
 * On:Node 로고. SVG가 색 없는 모양(마스크)이라 앱 사이드바처럼 마스크로 쓰고 메인 블루를 입힌다.
 * 시안 크기 110×21 (원본 비율 유지)
 */
export default function LandingLogo({ className = '' }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="On:Node"
      className={`block h-[21px] w-[110px] bg-[rgb(var(--ds-main-blue))] [mask:url(/onnode/auth/imgGroup268.svg)_center/contain_no-repeat] ${className}`}
    />
  );
}
