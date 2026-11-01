import LandingSection from '../LandingSection';
import SectionHeader from '../SectionHeader';
import StepCard from '../StepCard';
import { STEPS } from '../steps';

export default function HowItWorksSection() {
  return (
    <div className="bg-[var(--landing-tint)]">
      <LandingSection id="how" className="px-6 pt-[100px] pb-[123px]">
        <SectionHeader title="사용 방법은 간단해요" description="세 단계면 회의가 구조화된 노드로 정리돼요." />
        <ol className="mx-auto mt-[52px] flex w-full max-w-[1120px] items-stretch gap-6">
          {STEPS.map((step, index) => (
            <StepCard key={step.id} step={step} order={index + 1} />
          ))}
        </ol>
      </LandingSection>
    </div>
  );
}
