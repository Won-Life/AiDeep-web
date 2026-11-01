import LandingSection from '../LandingSection';
import PainPointCard from '../PainPointCard';
import SectionHeader from '../SectionHeader';
import { INTRO_ID } from '../landingNav';
import { PAIN_POINTS } from '../painPoints';

export default function PainPointsSection() {
  return (
    <LandingSection id={INTRO_ID} className="pb-[111px]">
      <SectionHeader title="회의록, 아직도 이렇게 쓰시나요?" />
      {/* 카드 4장(1336px)이 한 줄에 들어갈 때만 가로로 놓고, 좁으면 2×2로 정리한다 */}
      <div className="mt-[50px] grid grid-cols-[repeat(2,304px)] justify-center gap-10 px-6 min-[1384px]:flex">
        {PAIN_POINTS.map((point) => (
          <PainPointCard key={point.id} point={point} />
        ))}
      </div>
    </LandingSection>
  );
}
