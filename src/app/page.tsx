import LandingHero from "@/components/landing/LandingHero"
import LandingMotion from "@/components/landing/LandingMotion"
import LandingNav from "@/components/landing/LandingNav"
import {
  DirectionSection,
  FaqSection,
  FinalSection,
  FormatsSection,
  LandingFooter,
  LibrarySection,
  ModesSection,
  PixelIaSection,
  PricingSection,
} from "@/components/landing/LandingSections"
import LandingStory from "@/components/landing/LandingStory"
import s from "@/components/landing/Landing.module.css"

export default function Home() {
  return (
    <main id="top" className={`landingPage ${s.root}`}>
      <LandingMotion />
      <LandingNav />
      <LandingHero />
      <LandingStory />
      <FormatsSection />
      <PixelIaSection />
      <ModesSection />
      <LibrarySection />
      <DirectionSection />
      <PricingSection />
      <FaqSection />
      <FinalSection />
      <LandingFooter />
    </main>
  )
}
