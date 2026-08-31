import { useLanguage } from "@/contexts/LanguageContext";

/** Bandeau defilant, respiration entre le hero et les tarifs. */
export default function Marquee() {
  const { t } = useLanguage();
  const items = [...t.marquee, ...t.marquee, ...t.marquee];

  return (
    <div className="relative overflow-hidden border-b border-carbon/10 bg-paper-soft py-4">
      <div className="flex w-max animate-[marquee_42s_linear_infinite] items-center gap-8">
        {items.map((label, i) => (
          <span key={`${label}-${i}`} className="flex items-center gap-8">
            <span className="whitespace-nowrap font-body text-[12px] font-medium uppercase tracking-widest text-stone">
              {label}
            </span>
            <span className="h-1 w-1 rounded-full bg-brass/50" />
          </span>
        ))}
      </div>
      <style>{`@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-33.333%); } }`}</style>
    </div>
  );
}
