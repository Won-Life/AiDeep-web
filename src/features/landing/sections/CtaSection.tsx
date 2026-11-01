import { CtaCharacters, CtaWaves } from '../CtaDecor';
import LandingButton from '../LandingButton';
import { LOGIN_PATH } from '../landingNav';

export default function CtaSection() {
  return (
    <section id="cta" className="relative scroll-mt-[92px] overflow-hidden bg-[var(--landing-surface-pale)] pt-[117px] pb-[138px]">
      <CtaWaves />
      <div className="relative flex flex-col items-center gap-[17.4px] px-6 text-center">
        <h2 className="text-[39.1px] leading-[1.5] font-bold text-[var(--landing-primary)]">다음 회의부터, On:Node와 함께해요</h2>
        <p className="text-[17.4px] leading-[1.5] text-[var(--landing-text-muted)]">지금 바로 시작해 볼까요?</p>
        <LandingButton href={LOGIN_PATH} size="large">
          On:Node 시작하기
        </LandingButton>
      </div>
      <CtaCharacters />
    </section>
  );
}
