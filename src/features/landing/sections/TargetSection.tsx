import LandingSection from '../LandingSection';

export default function TargetSection() {
  return (
    <LandingSection id="target" className="border-b border-dashed border-[var(--landing-primary)]/40">
      <p className="py-16 text-center text-[14px] text-[var(--landing-text-muted)]">08 Target (작업 예정)</p>
    </LandingSection>
  );
}
