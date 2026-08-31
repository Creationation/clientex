import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Reveal, SectionHead } from "@/components/ui/Primitives";
import type { Service } from "@/data/types";
import { formatPrice } from "@/lib/utils";

const GROUP_ORDER: Service["category"][] = ["hair", "beard", "shave", "extra"];

export function serviceName(s: Service, lang: string): string {
  if (lang === "en") return s.name_en || s.name_de;
  if (lang === "tr") return s.name_tr || s.name_de;
  return s.name_de;
}

export default function Services({ services }: { services: Service[] }) {
  const { t, lang } = useLanguage();

  const groups = GROUP_ORDER.map((key) => ({
    key,
    label: t.services.groups[key],
    items: services.filter((s) => s.category === key),
  })).filter((g) => g.items.length > 0);

  return (
    <section id="leistungen" className="relative border-t border-white/[0.07] py-28 md:py-36">
      <div className="container">
        <div className="grid gap-14 lg:grid-cols-[0.9fr_1.4fr] lg:gap-24">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <SectionHead
              eyebrow={t.services.eyebrow}
              title={
                <>
                  {t.services.title}
                  <span className="brass-text italic">.</span>
                </>
              }
              sub={t.services.sub}
            />
            <Reveal delay={120} className="mt-10">
              <Link to="/termin" className="btn-brass">
                {t.nav.book}
              </Link>
            </Reveal>
          </div>

          <div className="space-y-14">
            {groups.map((group, gi) => (
              <Reveal key={group.key} delay={gi * 80}>
                <h3 className="flex items-center gap-4 font-body text-[10px] uppercase tracking-brand text-brass">
                  {group.label}
                  <span className="h-px flex-1 bg-white/[0.08]" />
                </h3>

                <ul className="mt-6">
                  {group.items.map((s) => (
                    <li key={s.id} className="group border-b border-white/[0.07]">
                      <Link
                        to={`/termin?service=${s.id}`}
                        className="flex items-baseline gap-4 py-5 transition-colors hover:bg-white/[0.02]"
                      >
                        <span className="font-display text-lg text-bone transition-colors group-hover:text-brass md:text-xl">
                          {serviceName(s, lang)}
                        </span>
                        <span className="hidden flex-1 translate-y-[-4px] border-b border-dotted border-white/15 sm:block" />
                        <span className="font-body text-[11px] uppercase tracking-widest text-smoke">
                          {s.duration_min} {t.common.min}
                        </span>
                        <span className="ml-4 min-w-[68px] text-right font-display text-lg text-bone md:text-xl">
                          {s.is_from_price ? (
                            <span className="mr-1 font-body text-[10px] uppercase tracking-widest text-smoke">
                              {t.common.from}
                            </span>
                          ) : null}
                          {formatPrice(s.price)}
                          <span className="ml-1 text-xs text-brass">EUR</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
