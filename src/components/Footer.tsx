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
    <footer className="bg-carbon pb-28 pt-20 text-paper md:pb-12">
      <div className="container">
        <div className="grid gap-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <Wordmark tone="dark" />
            <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-paper/65">
              {t.footer.tagline}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={SALON.phoneHref}
                className="inline-flex items-center gap-2 rounded-full border border-paper/20 px-4 py-2 font-body text-[12px] text-paper/80 transition-colors hover:border-paper/50 hover:text-paper"
              >
                <Phone size={13} /> {SALON.phone}
              </a>
              <a
                href={SALON.mapsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-paper/20 px-4 py-2 font-body text-[12px] text-paper/80 transition-colors hover:border-paper/50 hover:text-paper"
              >
                <MapPin size={13} /> {SALON.street}, {SALON.postalCode} {SALON.city}
              </a>
              {SALON.instagram ? (
                <a
                  href={SALON.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-paper/20 px-4 py-2 font-body text-[12px] text-paper/80 transition-colors hover:border-paper/50 hover:text-paper"
                >
                  <Instagram size={13} /> Instagram
                </a>
              ) : null}
            </div>
          </div>

          <div>
            <p className="font-body text-[10px] font-semibold uppercase tracking-brand text-paper/50">
              {t.nav.hours}
            </p>
            <ul className="mt-5 space-y-2">
              {WEEK_ORDER.map((weekday) => {
                const h = openingHours.find((x) => x.weekday === weekday);
                return (
                  <li
                    key={weekday}
                    className="flex justify-between gap-4 font-body text-[13px] text-paper/60"
                  >
                    <span>{t.hours.daysShort[weekday]}</span>
                    <span className={h?.is_open ? "text-paper/85" : "text-paper/35"}>
                      {h?.is_open ? `${h.open_time} - ${h.close_time}` : t.hours.closed}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <p className="font-body text-[10px] font-semibold uppercase tracking-brand text-paper/50">
              {t.nav.book}
            </p>
            <Link to="/termin" className="btn-light mt-5 w-full">
              {t.nav.book}
            </Link>
            <div className="mt-6 flex flex-col gap-2.5">
              <Link
                to="/impressum"
                className="font-body text-[13px] text-paper/60 transition-colors hover:text-paper"
              >
                {t.footer.impressum}
              </Link>
              <Link
                to="/datenschutz"
                className="font-body text-[13px] text-paper/60 transition-colors hover:text-paper"
              >
                {t.footer.datenschutz}
              </Link>
              <Link
                to="/admin"
                className="font-body text-[13px] text-paper/35 transition-colors hover:text-paper"
              >
                {t.footer.admin}
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-3 border-t border-paper/10 pt-7 md:flex-row md:items-center">
          <p className="font-body text-[12px] text-paper/40">
            &copy; {new Date().getFullYear()} {SALON.name}. {t.footer.rights}
          </p>
          <p className="font-body text-[12px] text-paper/30">Creationation · Wien</p>
        </div>
      </div>
    </footer>
  );
}
