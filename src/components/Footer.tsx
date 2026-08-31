import { Link } from "react-router-dom";
import { Instagram, MapPin, Phone } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { SALON } from "@/data/salon";
import { Wordmark } from "./Header";
import type { OpeningHour } from "@/data/types";

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export default function Footer({ openingHours }: { openingHours: OpeningHour[] }) {
  const { t } = useLanguage();

  return (
    <footer className="relative border-t border-white/[0.07] bg-ink-soft pb-28 pt-20 md:pb-10">
      <div className="container">
        <div className="grid gap-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <Wordmark />
            <p className="mt-6 max-w-sm text-sm font-light leading-relaxed text-smoke">
              {t.footer.tagline}
            </p>
            <div className="mt-7 flex flex-wrap gap-4">
              <a
                href={SALON.phoneHref}
                className="flex items-center gap-2 font-body text-[11px] uppercase tracking-widest text-smoke transition-colors hover:text-brass"
              >
                <Phone size={12} /> {SALON.phone}
              </a>
              <a
                href={SALON.mapsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 font-body text-[11px] uppercase tracking-widest text-smoke transition-colors hover:text-brass"
              >
                <MapPin size={12} /> {SALON.street}, {SALON.postalCode} {SALON.city}
              </a>
              {SALON.instagram ? (
                <a
                  href={SALON.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 font-body text-[11px] uppercase tracking-widest text-smoke transition-colors hover:text-brass"
                >
                  <Instagram size={12} /> Instagram
                </a>
              ) : null}
            </div>
          </div>

          <div>
            <p className="eyebrow">{t.nav.hours}</p>
            <ul className="mt-5 space-y-2">
              {WEEK_ORDER.map((weekday) => {
                const h = openingHours.find((x) => x.weekday === weekday);
                return (
                  <li
                    key={weekday}
                    className="flex justify-between gap-4 font-body text-[11px] uppercase tracking-widest text-smoke"
                  >
                    <span>{t.hours.daysShort[weekday]}</span>
                    <span className={h?.is_open ? "text-bone/80" : "text-smoke/50"}>
                      {h?.is_open ? `${h.open_time} - ${h.close_time}` : t.hours.closed}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <p className="eyebrow">{t.nav.book}</p>
            <Link to="/termin" className="btn-brass mt-5 w-full">
              {t.nav.book}
            </Link>
            <div className="mt-6 flex flex-col gap-2">
              <Link
                to="/impressum"
                className="font-body text-[11px] uppercase tracking-widest text-smoke transition-colors hover:text-brass"
              >
                {t.footer.impressum}
              </Link>
              <Link
                to="/datenschutz"
                className="font-body text-[11px] uppercase tracking-widest text-smoke transition-colors hover:text-brass"
              >
                {t.footer.datenschutz}
              </Link>
              <Link
                to="/admin"
                className="font-body text-[11px] uppercase tracking-widest text-smoke/50 transition-colors hover:text-brass"
              >
                {t.footer.admin}
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-white/[0.07] pt-7 md:flex-row md:items-center">
          <p className="font-body text-[10px] uppercase tracking-widest text-smoke/60">
            &copy; {new Date().getFullYear()} {SALON.name}. {t.footer.rights}
          </p>
          <p className="font-body text-[10px] uppercase tracking-widest text-smoke/40">
            Creationation · Wien
          </p>
        </div>
      </div>
    </footer>
  );
}
