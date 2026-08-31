import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Reveal, SectionHead } from "@/components/ui/Primitives";
import type { Service } from "@/data/types";
import { formatPrice } from "@/lib/utils";

const GROUP_ORDER: Service["category"][] = ["hair", "beard", "shave", "extra"];

export function serviceName(s: Service, lang: string): string {
  return lang === "en" ? s.name_en || s.name_de : s.name_de;
}

export default function Services({ services }: { services: Service[] }) {
  const { t, lang } = useLanguage();

  const groups = GROUP_ORDER.map((key) => ({
    key,
    label: t.services.groups[key],
    items: services.filter((s) => s.category === key),
  })).filter((g) => g.items.length > 0);

  return (
    <section id="leistungen" className="bg-paper py-24 md:py-32">
      <div className="container">
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.35fr] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <SectionHead eyebrow={t.services.eyebrow} title={t.services.title} sub={t.services.sub} />
            <Reveal delay={100} className="mt-8">
              <Link to="/termin" className="btn-solid">
                {t.nav.book}
              </Link>
              <p className="mt-4 max-w-xs font-body text-[13px] leading-relaxed text-stone">
                {t.services.multiHint}
              </p>
            </Reveal>
          </div>

          <div className="space-y-10">
            {groups.map((group, gi) => (
              <Reveal key={group.key} delay={gi * 70}>
                <h3 className="flex items-center gap-4 font-body text-[10px] font-semibold uppercase tracking-brand text-brass">
                  {group.label}
                  <span className="h-px flex-1 bg-carbon/10" />
                </h3>

                <ul className="mt-4 space-y-2">
                  {group.items.map((s) => (
                    <li key={s.id}>
                      <Link
                        to={`/termin?service=${s.id}`}
                        className="group flex items-center gap-4 rounded-2xl border border-carbon/10 bg-white px-5 py-4 transition-all duration-300 hover:border-carbon/25 hover:shadow-soft"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block font-display text-[19px] font-medium text-carbon">
                            {serviceName(s, lang)}
                          </span>
                          <span className="mt-0.5 block font-body text-[12px] text-stone">
                            {s.duration_min} {t.common.min}
                          </span>
                        </span>
                        <span className="shrink-0 text-right font-display text-[19px] font-semibold text-carbon">
                          {s.is_from_price ? (
                            <span className="mr-1 font-body text-[11px] font-medium text-stone">
                              {t.common.from}
                            </span>
                          ) : null}
                          {formatPrice(s.price)}
                          <span className="ml-1 font-body text-[12px] font-medium text-stone">
                            EUR
                          </span>
                        </span>
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-carbon/12 text-carbon transition-colors group-hover:bg-carbon group-hover:text-paper">
                          <ArrowUpRight size={14} />
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
