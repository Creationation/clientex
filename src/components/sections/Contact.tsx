import { MapPin, MessageCircle, Navigation, Phone } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Reveal, SectionHead } from "@/components/ui/Primitives";
import { SALON } from "@/data/salon";

export default function Contact() {
  const { t } = useLanguage();

  return (
    <section id="kontakt" className="border-t border-carbon/10 bg-paper-soft py-24 md:py-32">
      <div className="container">
        <SectionHead eyebrow={t.contact.eyebrow} title={t.contact.title} />

        <div className="mt-12 grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <Reveal>
            <div className="rounded-3xl border border-carbon/10 bg-white p-7 shadow-soft">
              <p className="eyebrow flex items-center gap-2">
                <MapPin size={12} /> {t.contact.address}
              </p>
              <p className="mt-3 font-display text-[24px] font-medium leading-snug text-carbon">
                {SALON.street}
                <br />
                {SALON.postalCode} {SALON.city}
              </p>

              <p className="eyebrow mt-8 flex items-center gap-2">
                <Phone size={12} /> {t.contact.phone}
              </p>
              <a
                href={SALON.phoneHref}
                className="mt-2 block font-display text-[24px] font-medium text-carbon transition-colors hover:text-brass"
              >
                {SALON.phone}
              </a>

              <div className="mt-8 flex flex-wrap gap-3">
                <a href={SALON.phoneHref} className="btn-solid !px-6 !py-3.5">
                  <Phone size={14} />
                  {t.contact.call}
                </a>
                <a
                  href={SALON.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost !px-6 !py-3.5"
                >
                  <MessageCircle size={14} />
                  {t.contact.whatsapp}
                </a>
                <a
                  href={SALON.mapsLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost !px-6 !py-3.5"
                >
                  <Navigation size={14} />
                  {t.contact.directions}
                </a>
              </div>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <div className="overflow-hidden rounded-3xl border border-carbon/10 shadow-soft">
              <iframe
                title={t.contact.mapTitle}
                src={SALON.mapsEmbed}
                width="100%"
                height="460"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="block w-full grayscale-[0.35]"
                style={{ border: 0 }}
              />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
