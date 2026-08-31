import { Link } from "react-router-dom";
import { ArrowDown, Phone, Star } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { SALON, SALON_ADDRESS_LINE } from "@/data/salon";
import { ArchFrame } from "@/components/ui/Primitives";
import type { OpeningHour } from "@/data/types";
import { openStatus } from "@/lib/slots";

export default function Hero({ openingHours }: { openingHours: OpeningHour[] }) {
  const { t } = useLanguage();
  const status = openStatus(openingHours);

  return (
    <section className="grain relative flex min-h-[100svh] items-center overflow-hidden bg-marble pt-28">
      {/* Halo laiton diffus */}
      <div className="pointer-events-none absolute -right-40 top-1/4 h-[560px] w-[560px] rounded-full bg-brass/[0.07] blur-[120px]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink to-transparent" />

      {/* Filet vertical decoratif */}
      <div className="pointer-events-none absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-white/[0.06] to-transparent lg:block" />

      <div className="container relative z-10 grid items-center gap-16 pb-24 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="animate-rise">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <span className="eyebrow">{t.hero.eyebrow}</span>
            <span className="flex items-center gap-1.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} size={11} className="fill-brass text-brass" />
              ))}
              <span className="ml-1 font-body text-[11px] tracking-widest text-smoke">
                {SALON.rating.toString().replace(".", ",")} · {SALON.reviewCount} {t.hero.reviews}
              </span>
            </span>
          </div>

          <h1 className="mt-8 font-display text-[clamp(3rem,10vw,6.5rem)] leading-[0.92] tracking-[-0.01em]">
            <span className="block text-bone">{t.hero.titleTop}</span>
            <span className="brass-text block italic">{t.hero.titleBottom}</span>
          </h1>

          <div className="mt-9 flex items-start gap-5">
            <span className="mt-3 hidden h-px w-16 shrink-0 bg-brass/60 sm:block" />
            <p className="max-w-lg text-[15px] font-light leading-relaxed text-smoke">
              {t.hero.sub}
            </p>
          </div>

          <div className="mt-11 flex flex-wrap items-center gap-4">
            <Link to="/termin" className="btn-brass">
              {t.hero.cta}
            </Link>
            <a href={SALON.phoneHref} className="btn-ghost">
              <Phone size={13} />
              {t.hero.ctaCall}
            </a>
          </div>

          <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-white/[0.07] pt-7 font-body text-[11px] uppercase tracking-widest text-smoke">
            <span>{SALON_ADDRESS_LINE}</span>
            <span className="flex items-center gap-2">
              <span
                className={`h-1.5 w-1.5 rounded-full ${status.open ? "bg-success" : "bg-smoke/60"}`}
              />
              {status.open
                ? `${t.status.openUntil} ${status.until}`
                : status.until
                  ? `${t.status.closedUntil} ${status.until}`
                  : t.status.closedToday}
            </span>
          </div>
        </div>

        {/* Panneau arche */}
        <div className="relative hidden lg:block">
          <div className="animate-fade">
            <ArchFrame ratio="aspect-[4/5]" index={0} tone="from-[#191510] to-[#040404]" />
          </div>

          <div className="absolute -left-10 bottom-10 w-56 border border-brass/25 bg-ink/90 p-5 backdrop-blur-sm">
            <p className="eyebrow">{t.services.eyebrow}</p>
            <p className="mt-3 font-display text-4xl text-bone">
              25<span className="ml-1 text-lg text-brass">EUR</span>
            </p>
            <p className="mt-1 font-body text-[11px] uppercase tracking-widest text-smoke">
              Herrenhaarschnitt · 30 {t.common.min}
            </p>
          </div>

          <span className="absolute -right-6 top-1/2 origin-center -translate-y-1/2 rotate-90 font-body text-[10px] uppercase tracking-brand text-white/20">
            1220 Wien Donaustadt
          </span>
        </div>
      </div>

      <button
        onClick={() =>
          document.getElementById("leistungen")?.scrollIntoView({ behavior: "smooth" })
        }
        className="absolute bottom-8 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-3 text-smoke transition-colors hover:text-brass md:flex"
      >
        <span className="font-body text-[10px] uppercase tracking-brand">{t.hero.scroll}</span>
        <ArrowDown size={14} className="animate-bounce" />
      </button>
    </section>
  );
}
