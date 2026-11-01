import './landing.css';
import EntryGate from './EntryGate';
import LandingNav from './sections/LandingNav';
import HeroSection from './sections/HeroSection';
import PainPointsSection from './sections/PainPointsSection';
import TransitionSection from './sections/TransitionSection';
import FeaturesSection from './sections/FeaturesSection';
import HowItWorksSection from './sections/HowItWorksSection';
import TrySection from './sections/TrySection';
import TargetSection from './sections/TargetSection';
import CtaSection from './sections/CtaSection';
import LandingFooter from './sections/LandingFooter';

export default function LandingPage() {
  return (
    <div className="landing min-h-screen bg-white">
      <EntryGate />
      <LandingNav />
      <main>
        <HeroSection />
        <PainPointsSection />
        <TransitionSection />
        <FeaturesSection />
        <HowItWorksSection />
        <TrySection />
        <TargetSection />
        <CtaSection />
      </main>
      <LandingFooter />
    </div>
  );
}
