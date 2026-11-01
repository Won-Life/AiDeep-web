import LandingSection from '../LandingSection';
import SectionHeader from '../SectionHeader';
import TryDemo from '../try/TryDemo';

export default function TrySection() {
  return (
    <div className="bg-[linear-gradient(to_bottom,var(--landing-tint)_2.792%,white_51.754%)]">
      <LandingSection id="try" className="px-6 pt-[53px] pb-[99px]">
        <SectionHeader
          title="직접 체험해 보세요"
          description="프로젝트 만들기부터 회의 녹음까지, On:Node가 돌아가는 방식을 직접 만들어 보며 확인해 보세요."
        />
        <div className="mt-[87px]">
          <TryDemo />
        </div>
        <p className="mx-auto mt-[55px] max-w-[650px] text-center text-[16.9px] leading-[1.5] text-[var(--landing-text-muted)]">
          체험은 저장되지 않아요. 가입하면 회의당 최대 30분까지 무료로 녹음할 수 있어요.
        </p>
      </LandingSection>
    </div>
  );
}
