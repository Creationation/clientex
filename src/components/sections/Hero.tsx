import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, MapPin, Phone, Star } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { SALON, SALON_ADDRESS_LINE } from "@/data/salon";
import { MEDIA } from "@/data/seed";
import type { OpeningHour } from "@/data/types";
import { openStatus } from "@/lib/slots";

/**
 * Hero video plein ecran.
 * La video est auto-hebergee (public/media), muette, en boucle et sans
 * controles : c'est un decor, pas un lecteur. Une affiche prend le relais
 * tant que le fichier n'est pas charge, et sur les connexions economes ou
 * quand l'utilisateur a demande moins d'animations.
 */
export default function Hero({ openingHours }: { openingHours: OpeningHour[] }) {
  const { t } = useLanguage();
  const status = openStatus(openingHours);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = (navigator as { connection?: { saveData?: boolean } }).connection?.saveData;
    if (reduced || saveData) return;
    videoRef.current?.play().catch(() => {
      /* lecture refusee : l'affiche reste visible */
    });
  }, []);

  const mobile = typeof window !== "undefined" && window.innerWidth < 768;

  return (
    <section className="relative flex min-h-[100svh] items-end overflow-hidden bg-carbon">
      <video
        ref={videoRef}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
          ready ? "opacity-100" : "opacity-0"
        }`}
        src={mobile ? MEDIA.heroVideoMobile : MEDIA.heroVideo}
        poster={MEDIA.heroPoster}
        muted
        loop
        playsInline
        preload="metadata"
        onCanPlay={() => setReady(true)}
        aria-hidden="true"
      />

      {/* Voiles : lisibilite du texte sans assombrir toute l'image */}
      <div className="absolute inset-0 bg-gradient-to-t from-carbon via-carbon/70 to-carbon/25" />
      <div className="absolute inset-0 bg-gradient-to-r from-carbon/85 via-carbon/35 to-transparent" />

      <div className="container relative z-10 pb-16 pt-32 md:pb-24">
        <div className="max-w-2xl animate-rise">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-paper/25 bg-carbon/40 px-3.5 py-1.5 backdrop-blur-sm">
              <span className="flex items-center gap-0.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} size={11} className="fill-brass-light text-brass-light" />
                ))}
              </span>
              <span className="font-body text-[11px] font-medium text-paper/85">
                {SALON.rating.toString().replace(".", ",")} · {SALON.reviewCount} {t.hero.reviews}
              </span>
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-paper/25 bg-carbon/40 px-3.5 py-1.5 font-body text-[11px] font-medium text-paper/85 backdrop-blur-sm">
              <span
                className={`h-1.5 w-1.5 rounded-full ${status.open ? "bg-success" : "bg-paper/50"}`}
              />
              {status.open
                ? `${t.status.openUntil} ${status.until}`
                : status.until
                  ? `${t.status.closedUntil} ${status.until}`
                  : t.status.closedToday}
            </span>
          </div>

          <h1 className="mt-7 font-display text-[clamp(2.6rem,7.5vw,5rem)] font-semibold leading-[0.98] text-paper">
            {t.hero.titleTop}
            <br />
            <span className="text-brass-light">{t.hero.titleBottom}</span>
          </h1>

          <p className="mt-6 max-w-lg text-[16px] leading-relaxed text-paper/75">{t.hero.sub}</p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link to="/termin" className="btn-light">
              {t.hero.cta}
            </Link>
            <a href={SALON.phoneHref} className="btn-outline-light">
              <Phone size={14} />
              {t.hero.ctaCall}
            </a>
          </div>

          <a
            href={SALON.mapsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-2 font-body text-[12px] text-paper/60 transition-colors hover:text-paper"
          >
            <MapPin size={13} />
            {SALON_ADDRESS_LINE}
          </a>
        </div>
      </div>

      <button
        onClick={() => document.getElementById("leistungen")?.scrollIntoView({ behavior: "smooth" })}
        className="absolute bottom-7 right-7 z-10 hidden h-12 w-12 items-center justify-center rounded-full border border-paper/25 text-paper/70 transition-colors hover:bg-paper/10 hover:text-paper md:flex"
        aria-label={t.hero.scroll}
      >
        <ArrowDown size={16} />
      </button>
    </section>
  );
}
