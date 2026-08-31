import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingActions from "@/components/FloatingActions";
import Seo from "@/components/Seo";
import Hero from "@/components/sections/Hero";
import Marquee from "@/components/sections/Marquee";
import Services from "@/components/sections/Services";
import Team from "@/components/sections/Team";
import Gallery from "@/components/sections/Gallery";
import Hours from "@/components/sections/Hours";
import Contact from "@/components/sections/Contact";
import { useSalonData } from "@/hooks/useSalonData";

export default function Landing() {
  const { services, barbers, openingHours } = useSalonData();
  const location = useLocation();

  // Ancre transmise depuis une autre page (ex: /impressum -> /#kontakt)
  useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.slice(1);
    const timer = setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
    return () => clearTimeout(timer);
  }, [location.hash]);

  return (
    <>
      <Seo openingHours={openingHours} />
      <Header openingHours={openingHours} />
      <main>
        <Hero openingHours={openingHours} />
        <Marquee />
        <Services services={services} />
        <Team barbers={barbers} />
        <Gallery />
        <Hours openingHours={openingHours} />
        <Contact />
      </main>
      <Footer openingHours={openingHours} />
      <FloatingActions />
    </>
  );
}
