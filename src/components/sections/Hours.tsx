import { useLanguage } from "@/contexts/LanguageContext";
import { Reveal, SectionHead } from "@/components/ui/Primitives";
import type { OpeningHour } from "@/data/types";
import { cn } from "@/lib/utils";

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export default function Hours({ openingHours }: { openingHours: OpeningHour[] }) {
  const { t } = useLanguage();
  const todayIdx = new Date().getDay();

  const rows = WEEK_ORDER.map((weekday) => ({
    weekday,
    hour: openingHours.find((h) => h.weekday === weekday),
  }));

  return (
    <section id="zeiten" className="relative border-t border-white/[0.07] py-28 md:py-36">
      <div className="container">
        <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-24">
          <SectionHead eyebrow={t.hours.eyebrow} title={t.hours.title} sub={t.hours.sub} />

          <Reveal delay={100}>
            <ul className="border-t border-white/[0.07]">
              {rows.map(({ weekday, hour }) => {
                const isToday = weekday === todayIdx;
                const open = hour?.is_open ?? false;
                return (
                  <li
                    key={weekday}
                    className={cn(
                      "flex items-center justify-between gap-4 border-b border-white/[0.07] py-5 transition-colors",
                      isToday && "bg-brass/[0.06] px-4",
                    )}
                  >
                    <span className="flex items-center gap-3">
                      {isToday ? <span className="h-1.5 w-1.5 rounded-full bg-brass" /> : null}
                      <span
                        className={cn(
                          "font-display text-lg",
                          isToday ? "text-brass" : open ? "text-bone" : "text-smoke",
                        )}
                      >
                        {t.hours.days[weekday]}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "font-body text-[12px] uppercase tracking-widest",
                        open ? "text-bone" : "text-smoke/60",
                      )}
                    >
                      {open ? `${hour!.open_time} - ${hour!.close_time}` : t.hours.closed}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-6 font-body text-[11px] uppercase tracking-widest text-smoke/70">
              {t.hours.note}
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
