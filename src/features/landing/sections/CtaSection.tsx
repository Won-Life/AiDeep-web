import LandingSection from '../LandingSection';

export default function CtaSection() {
  return (
    <LandingSection id="cta" className="border-b border-dashed border-[var(--landing-primary)]/40">
      <p className="py-16 text-center text-[14px] text-[var(--landing-text-muted)]">09 CTA (작업 예정)</p>
    </LandingSection>
  );
}
