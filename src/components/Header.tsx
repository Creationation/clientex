import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, Phone, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { LANGS, LANG_LABEL } from "@/i18n";
import { SALON } from "@/data/salon";
import { cn } from "@/lib/utils";
import type { OpeningHour } from "@/data/types";
import { openStatus } from "@/lib/slots";

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex flex-col leading-none">
      <span className="font-display text-2xl tracking-[0.18em] text-bone">DEL</span>
      {!compact ? (
        <span className="mt-1 font-body text-[8px] uppercase tracking-brand text-brass">
          Herren Friseur
        </span>
      ) : null}
    </span>
  );
}

export default function Header({ openingHours }: { openingHours: OpeningHour[] }) {
  const { t, lang, setLang } = useLanguage();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const links = [
    { id: "leistungen", label: t.nav.services },
    { id: "team", label: t.nav.team },
    { id: "salon", label: t.nav.gallery },
    { id: "zeiten", label: t.nav.hours },
    { id: "kontakt", label: t.nav.contact },
  ];

  const go = (id: string) => {
    setMenuOpen(false);
    if (location.pathname !== "/") {
      navigate(`/#${id}`);
      return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const status = openStatus(openingHours);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-500",
          scrolled
            ? "border-b border-white/10 bg-ink/92 py-3 backdrop-blur-xl"
            : "border-b border-transparent py-6",
        )}
      >
        <div className="container flex items-center justify-between gap-6">
          <Link to="/" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <Wordmark />
          </Link>

          <nav className="hidden items-center gap-8 lg:flex">
            {links.map((l) => (
              <button
                key={l.id}
                onClick={() => go(l.id)}
                className="relative font-body text-[11px] uppercase tracking-widest text-smoke transition-colors hover:text-bone"
              >
                {l.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-1 border border-white/10 px-1 py-1 sm:flex">
              {LANGS.map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={cn(
                    "px-2 py-1 font-body text-[10px] tracking-widest transition-colors",
                    lang === l ? "bg-brass text-ink" : "text-smoke hover:text-bone",
                  )}
                  aria-label={`Sprache ${LANG_LABEL[l]}`}
                >
                  {LANG_LABEL[l]}
                </button>
              ))}
            </div>

            <a
              href={SALON.phoneHref}
              className="hidden h-9 w-9 items-center justify-center border border-white/10 text-smoke transition-colors hover:border-brass hover:text-brass md:flex"
              aria-label={t.contact.call}
            >
              <Phone size={14} />
            </a>

            <Link to="/termin" className="btn-brass hidden !px-6 !py-3 md:inline-flex">
              {t.nav.book}
            </Link>

            <button
              onClick={() => setMenuOpen(true)}
              className="flex h-9 w-9 items-center justify-center border border-white/10 text-bone lg:hidden"
              aria-label="Menu"
            >
              <Menu size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Menu plein ecran mobile */}
      <div
        className={cn(
          "fixed inset-0 z-[60] bg-ink transition-opacity duration-500 lg:hidden",
          menuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <div className="container flex h-full flex-col py-6">
          <div className="flex items-center justify-between">
            <Wordmark />
            <button
              onClick={() => setMenuOpen(false)}
              className="flex h-9 w-9 items-center justify-center border border-white/10 text-bone"
              aria-label={t.common.close}
            >
              <X size={16} />
            </button>
          </div>

          <nav className="mt-16 flex flex-col gap-1">
            {links.map((l, i) => (
              <button
                key={l.id}
                onClick={() => go(l.id)}
                className="border-b border-white/5 py-5 text-left font-display text-3xl text-bone"
                style={{ transitionDelay: `${i * 40}ms` }}
              >
                {l.label}
              </button>
            ))}
          </nav>

          <div className="mt-auto space-y-4">
            <div className="flex items-center gap-2">
              {LANGS.map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={cn(
                    "border px-4 py-2 font-body text-[10px] tracking-widest transition-colors",
                    lang === l ? "border-brass bg-brass text-ink" : "border-white/10 text-smoke",
                  )}
                >
                  {LANG_LABEL[l]}
                </button>
              ))}
            </div>
            <p className="font-body text-[11px] uppercase tracking-widest text-smoke">
              {status.open
                ? `${t.status.openUntil} ${status.until}`
                : status.until
                  ? `${t.status.closedUntil} ${status.until}`
                  : t.status.closedToday}
            </p>
            <Link to="/termin" onClick={() => setMenuOpen(false)} className="btn-brass w-full">
              {t.nav.book}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
