import { MapPin, MessageCircle, Navigation, Phone } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Reveal, SectionHead } from "@/components/ui/Primitives";
import { SALON } from "@/data/salon";

export default function Contact() {
  const { t } = useLanguage();

  return (
    <section id="kontakt" className="relative border-t border-white/[0.07] py-28 md:py-36">
      <div className="container">
        <SectionHead eyebrow={t.contact.eyebrow} title={t.contact.title} />

        <div className="mt-16 grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <Reveal className="space-y-8">
            <div>
              <p className="eyebrow flex items-center gap-2">
                <MapPin size={12} /> {t.contact.address}
              </p>
              <p className="mt-3 font-display text-2xl leading-snug text-bone">
                {SALON.street}
                <br />
                {SALON.postalCode} {SALON.city}
              </p>
            </div>

            <div>
              <p className="eyebrow flex items-center gap-2">
                <Phone size={12} /> {t.contact.phone}
              </p>
              <a
                href={SALON.phoneHref}
                className="mt-3 block font-display text-2xl text-bone transition-colors hover:text-brass"
              >
                {SALON.phone}
              </a>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <a href={SALON.phoneHref} className="btn-brass">
                <Phone size={13} />
                {t.contact.call}
              </a>
              <a
                href={SALON.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost"
              >
                <MessageCircle size={13} />
                {t.contact.whatsapp}
              </a>
              <a
                href={SALON.mapsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost"
              >
                <Navigation size={13} />
                {t.contact.directions}
              </a>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="relative border border-white/10">
              <div className="pointer-events-none absolute inset-0 z-10 border border-brass/15" />
              <iframe
                title={t.contact.mapTitle}
                src={SALON.mapsEmbed}
                width="100%"
                height="440"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="block w-full grayscale-[0.85] contrast-[1.05] invert-[0.92] hue-rotate-180"
                style={{ border: 0 }}
              />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
