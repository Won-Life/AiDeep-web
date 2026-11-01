import FeatureShowcase from '../FeatureShowcase';
import LandingSection from '../LandingSection';
import SectionHeader from '../SectionHeader';

export default function FeaturesSection() {
  return (
    <LandingSection id="features" className="px-6 pt-[45px] pb-[72px]">
      <SectionHeader title="On:Node는 이런 기능을 제공해요" description="회의는 말로 끝나지 않게, 흐름은 한눈에 보이게." />
      <div className="mt-[50px]">
        <FeatureShowcase />
      </div>
    </LandingSection>
  );
}
