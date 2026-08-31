import { Link } from "react-router-dom";
import { CalendarDays, MessageCircle, Phone } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { SALON } from "@/data/salon";

/** Barre d'actions flottante sur mobile. Appel, WhatsApp, reservation. */
export default function FloatingActions() {
  const { t } = useLanguage();

  return (
    <div className="fixed inset-x-3 bottom-3 z-40 md:hidden">
      <div className="flex items-center gap-2 rounded-full border border-carbon/10 bg-paper/95 p-2 shadow-lift backdrop-blur-xl">
        <a
          href={SALON.phoneHref}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-carbon/12 text-carbon active:scale-95"
          aria-label={t.contact.call}
        >
          <Phone size={17} />
        </a>
        <a
          href={SALON.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-carbon/12 text-carbon active:scale-95"
          aria-label={t.contact.whatsapp}
        >
          <MessageCircle size={17} />
        </a>
        <Link
          to="/termin"
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-carbon font-body text-[12px] font-semibold uppercase tracking-widest text-paper active:scale-[0.98]"
        >
          <CalendarDays size={15} />
          {t.nav.book}
        </Link>
      </div>
    </div>
  );
}
