import { SoftReserveProvider } from '../context/SoftReserveContext'
import AnnouncementBar from '../components/landing/AnnouncementBar'
import Navbar from '../components/landing/Navbar'
import Hero from '../components/landing/Hero'
import VideoSection from '../components/landing/VideoSection'
import WhyChooseUs from '../components/landing/WhyChooseUs'
import ClientPortalHighlight from '../components/landing/ClientPortalHighlight'
import EventTypes from '../components/landing/EventTypes'
import Packages from '../components/landing/Packages'
import HowItWorks from '../components/landing/HowItWorks'
import FoodTasting from '../components/landing/FoodTasting'
import MenuHighlights from '../components/landing/MenuHighlights'
import DefaultInclusions from '../components/landing/DefaultInclusions'
import Gallery from '../components/landing/Gallery'
import Testimonials from '../components/landing/Testimonials'
import CTABanner from '../components/landing/CTABanner'
import Footer from '../components/landing/Footer'
import FloatingCTA from '../components/landing/FloatingCTA'
import FloatingMessenger from '../components/landing/FloatingMessenger'
import SoftReserveModal from '../components/landing/SoftReserveModal'

export default function Landing() {
  return (
    <SoftReserveProvider>
      <div className="fixed top-0 inset-x-0 z-50 flex flex-col">
        <AnnouncementBar />
        <Navbar />
      </div>
      <main>
        <Hero />
        <VideoSection />
        <WhyChooseUs />
        <ClientPortalHighlight />
        <EventTypes />
        <Packages />
        <HowItWorks />
        <FoodTasting />
        <MenuHighlights />
        <DefaultInclusions />
        <Gallery />
        <Testimonials />
        <CTABanner />
      </main>
      <Footer />
      <FloatingCTA />
      <FloatingMessenger />
      <SoftReserveModal />
    </SoftReserveProvider>
  )
}
