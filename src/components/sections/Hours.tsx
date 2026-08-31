import { useLanguage } from "@/contexts/LanguageContext";
import { Reveal, SectionHead } from "@/components/ui/Primitives";
import type { OpeningHour } from "@/data/types";
import { cn } from "@/lib/utils";

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export default function Hours({ openingHours }: { openingHours: OpeningHour[] }) {
  const { t } = useLanguage();
  const todayIdx = new Date().getDay();

  return (
    <section id="zeiten" className="border-t border-carbon/10 bg-paper py-24 md:py-32">
      <div className="container">
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <SectionHead eyebrow={t.hours.eyebrow} title={t.hours.title} sub={t.hours.sub} />

          <Reveal delay={80}>
            <ul className="overflow-hidden rounded-2xl border border-carbon/10 bg-white shadow-soft">
              {WEEK_ORDER.map((weekday) => {
                const hour = openingHours.find((h) => h.weekday === weekday);
                const isToday = weekday === todayIdx;
                const open = hour?.is_open ?? false;
                return (
                  <li
                    key={weekday}
                    className={cn(
                      "flex items-center justify-between gap-4 border-b border-carbon/[0.07] px-6 py-4 last:border-b-0",
                      isToday && "bg-paper-soft",
                    )}
                  >
                    <span className="flex items-center gap-2.5">
                      {isToday ? <span className="h-1.5 w-1.5 rounded-full bg-brass" /> : null}
                      <span
                        className={cn(
                          "font-display text-[18px]",
                          isToday ? "font-semibold text-carbon" : open ? "text-carbon" : "text-stone",
                        )}
                      >
                        {t.hours.days[weekday]}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "font-body text-[14px] tabular-nums",
                        open ? "text-carbon" : "text-stone/60",
                      )}
                    >
                      {open ? `${hour!.open_time} - ${hour!.close_time}` : t.hours.closed}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 font-body text-[13px] text-stone">{t.hours.note}</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
