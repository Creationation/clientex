import { Link } from "react-router-dom";
import { CalendarDays, MessageCircle, Phone } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { SALON } from "@/data/salon";

/** Barre d'actions collee en bas sur mobile. Appel, WhatsApp, reservation. */
export default function FloatingActions() {
  const { t } = useLanguage();

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-ink/95 backdrop-blur-xl md:hidden">
      <div className="grid grid-cols-3">
        <a
          href={SALON.phoneHref}
          className="flex flex-col items-center gap-1.5 border-r border-white/10 py-3.5 text-smoke transition-colors active:bg-white/5"
        >
          <Phone size={16} />
          <span className="font-body text-[9px] uppercase tracking-widest">{t.contact.call}</span>
        </a>
        <a
          href={SALON.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-1.5 border-r border-white/10 py-3.5 text-smoke transition-colors active:bg-white/5"
        >
          <MessageCircle size={16} />
          <span className="font-body text-[9px] uppercase tracking-widest">
            {t.contact.whatsapp}
          </span>
        </a>
        <Link
          to="/termin"
          className="flex flex-col items-center gap-1.5 bg-brass-sheen py-3.5 text-ink"
        >
          <CalendarDays size={16} />
          <span className="font-body text-[9px] font-medium uppercase tracking-widest">
            {t.nav.book}
          </span>
        </Link>
      </div>
    </div>
  );
}
