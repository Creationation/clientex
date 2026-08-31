import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, Phone, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { SALON } from "@/data/salon";
import { cn } from "@/lib/utils";
import type { OpeningHour } from "@/data/types";
import { openStatus } from "@/lib/slots";
import LanguageSwitcher from "./LanguageSwitcher";

/**
 * Lockup de marque : l'embleme aux ciseaux ailes, puis le nom.
 * L'embleme est servi en silhouette monochrome (ivoire sur fond sombre,
 * noir sur fond clair) : le rendu dore d'origine, avec ses reflets, devient
 * illisible a 28 px de haut et jure avec la palette desaturee du site.
 */
export function Wordmark({
  compact = false,
  tone = "light",
}: {
  compact?: boolean;
  tone?: "light" | "dark";
}) {
  return (
    <span className="flex items-center gap-2.5">
      <img
        src={tone === "dark" ? "/media/logo-paper.png" : "/media/logo-carbon.png"}
        alt="DEL Herren Friseur Barber Shop"
        width={389}
        height={256}
        className={cn("w-auto shrink-0", compact ? "h-7" : "h-9")}
      />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-display font-semibold tracking-[0.14em]",
            compact ? "text-[21px]" : "text-[26px]",
            tone === "dark" ? "text-paper" : "text-carbon",
          )}
        >
          DEL
        </span>
        {!compact ? (
          <span
            className={cn(
              "mt-1 font-body text-[8px] font-semibold uppercase tracking-brand",
              tone === "dark" ? "text-paper/60" : "text-brass",
            )}
          >
            Herren Friseur
          </span>
        ) : null}
      </span>
    </span>
  );
}

export default function Header({ openingHours }: { openingHours: OpeningHour[] }) {
  const { t } = useLanguage();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
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

  // Au-dessus du hero video le header est clair sur fond sombre.
  // Une fois passe le hero, il devient une barre ivoire.
  const dark = !scrolled;

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-500",
          scrolled ? "border-b border-carbon/10 bg-paper/90 py-3 backdrop-blur-xl" : "py-6",
        )}
      >
        <div className="container flex items-center justify-between gap-6">
          <Link to="/" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <Wordmark tone={dark ? "dark" : "light"} />
          </Link>

          <nav className="hidden items-center gap-7 lg:flex">
            {links.map((l) => (
              <button
                key={l.id}
                onClick={() => go(l.id)}
                className={cn(
                  "font-body text-[12px] font-medium tracking-wide transition-colors",
                  dark ? "text-paper/75 hover:text-paper" : "text-stone hover:text-carbon",
                )}
              >
                {l.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block">
              <LanguageSwitcher tone={dark ? "dark" : "light"} />
            </div>

            <a
              href={SALON.phoneHref}
              className={cn(
                "hidden h-10 w-10 items-center justify-center rounded-full border transition-colors md:flex",
                dark
                  ? "border-paper/25 text-paper/80 hover:bg-paper/10"
                  : "border-carbon/15 text-stone hover:bg-carbon/[0.05]",
              )}
              aria-label={t.contact.call}
            >
              <Phone size={15} />
            </a>

            <Link
              to="/termin"
              className={cn("hidden !px-6 !py-3 md:inline-flex", dark ? "btn-light" : "btn-solid")}
            >
              {t.nav.book}
            </Link>

            <button
              onClick={() => setMenuOpen(true)}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full border lg:hidden",
                dark ? "border-paper/25 text-paper" : "border-carbon/15 text-carbon",
              )}
              aria-label="Menu"
            >
              <Menu size={17} />
            </button>
          </div>
        </div>
      </header>

      {/* Menu plein ecran mobile */}
      <div
        className={cn(
          "fixed inset-0 z-[60] bg-paper transition-opacity duration-400 lg:hidden",
          menuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <div className="container flex h-full flex-col py-6">
          <div className="flex items-center justify-between">
            <Wordmark />
            <button
              onClick={() => setMenuOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-carbon/15 text-carbon"
              aria-label={t.common.close}
            >
              <X size={17} />
            </button>
          </div>

          <nav className="mt-12 flex flex-col">
            {links.map((l) => (
              <button
                key={l.id}
                onClick={() => go(l.id)}
                className="border-b border-carbon/10 py-5 text-left font-display text-[28px] text-carbon"
              >
                {l.label}
              </button>
            ))}
          </nav>

          <div className="mt-auto space-y-4">
            <LanguageSwitcher />
            <p className="font-body text-[12px] text-stone">
              {status.open
                ? `${t.status.openUntil} ${status.until}`
                : status.until
                  ? `${t.status.closedUntil} ${status.until}`
                  : t.status.closedToday}
            </p>
            <Link to="/termin" onClick={() => setMenuOpen(false)} className="btn-solid w-full">
              {t.nav.book}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
