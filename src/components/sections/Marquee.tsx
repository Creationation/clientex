import { useLanguage } from "@/contexts/LanguageContext";

/** Bandeau laiton defilant, respiration entre deux sections. */
export default function Marquee() {
  const { t } = useLanguage();
  const items = [...t.marquee, ...t.marquee, ...t.marquee];

  return (
    <div className="relative overflow-hidden border-y border-white/[0.07] py-4">
      <div className="flex w-max animate-[marquee_38s_linear_infinite] items-center gap-10">
        {items.map((label, i) => (
          <span key={`${label}-${i}`} className="flex items-center gap-10">
            <span className="whitespace-nowrap font-body text-[11px] uppercase tracking-brand text-smoke">
              {label}
            </span>
            <span className="h-1 w-1 rotate-45 bg-brass/40" />
          </span>
        ))}
      </div>
      <style>{`@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-33.333%); } }`}</style>
    </div>
  );
}
