import LandingSection from '../LandingSection';
import PainPointCard from '../PainPointCard';
import SectionHeader from '../SectionHeader';
import { INTRO_ID } from '../landingNav';
import { PAIN_POINTS } from '../painPoints';

export default function PainPointsSection() {
  return (
    <LandingSection id={INTRO_ID} className="pb-[111px]">
      <SectionHeader title="회의록, 아직도 이렇게 쓰시나요?" />
      <div className="mt-[50px] flex gap-10 px-[52px]">
        {PAIN_POINTS.map((point) => (
          <PainPointCard key={point.id} point={point} />
        ))}
      </div>
    </LandingSection>
  );
}
