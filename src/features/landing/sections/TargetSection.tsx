import LandingSection from '../LandingSection';
import SectionHeader from '../SectionHeader';
import TargetCard from '../TargetCard';
import { TARGETS } from '../targets';

export default function TargetSection() {
  return (
    <LandingSection id="target" className="relative z-[1] bg-[var(--landing-surface-pale)] px-6 pt-[100px]">
      <SectionHeader title="이런 분들께 추천해요" />
      <div className="mx-auto mt-12 grid max-w-[1149px] grid-cols-2 gap-[53px]">
        {TARGETS.map((target) => (
          <TargetCard key={target.id} target={target} />
        ))}
      </div>
    </LandingSection>
  );
}
