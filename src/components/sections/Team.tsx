import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Photo, Reveal, SectionHead } from "@/components/ui/Primitives";
import type { Barber } from "@/data/types";

export function barberRole(b: Barber, lang: string): string {
  return lang === "en" ? b.role_en || b.role_de : b.role_de;
}

export default function Team({ barbers }: { barbers: Barber[] }) {
  const { t, lang } = useLanguage();

  return (
    <section id="team" className="border-t border-carbon/10 bg-paper py-24 md:py-32">
      <div className="container">
        <SectionHead eyebrow={t.team.eyebrow} title={t.team.title} sub={t.team.sub} align="center" />

        <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {barbers.map((b, i) => (
            <Reveal key={b.id} delay={i * 90}>
              <Link
                to={`/termin?barber=${b.id}`}
                className="group block rounded-3xl border border-carbon/10 bg-white p-3 shadow-soft transition-shadow duration-300 hover:shadow-lift"
              >
                <Photo
                  src={b.image_url}
                  alt={b.name}
                  monogram={b.initials}
                  arch
                  ratio="aspect-[4/5]"
                />
                <div className="flex items-center justify-between gap-3 px-3 pb-2 pt-5">
                  <div>
                    <h3 className="font-display text-[22px] font-semibold text-carbon">{b.name}</h3>
                    <p className="mt-0.5 font-body text-[12px] text-stone">
                      {barberRole(b, lang)}
                    </p>
                  </div>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-carbon/15 text-carbon transition-colors group-hover:bg-carbon group-hover:text-paper">
                    <ArrowUpRight size={15} />
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
