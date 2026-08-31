import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArchFrame, Reveal, SectionHead } from "@/components/ui/Primitives";
import type { Barber } from "@/data/types";

export function barberRole(b: Barber, lang: string): string {
  if (lang === "en") return b.role_en || b.role_de;
  if (lang === "tr") return b.role_tr || b.role_de;
  return b.role_de;
}

export default function Team({ barbers }: { barbers: Barber[] }) {
  const { t, lang } = useLanguage();

  return (
    <section id="team" className="relative border-t border-white/[0.07] py-28 md:py-36">
      <div className="container">
        <SectionHead eyebrow={t.team.eyebrow} title={t.team.title} sub={t.team.sub} align="center" />

        <div className="mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {barbers.map((b, i) => (
            <Reveal key={b.id} delay={i * 110}>
              <Link to={`/termin?barber=${b.id}`} className="block">
                <ArchFrame
                  ratio="aspect-[4/5]"
                  index={i + 1}
                  src={b.image_url}
                  monogram={b.image_url ? undefined : b.initials}
                  tone={
                    [
                      "from-[#1d1c19] via-[#121111] to-[#0a0a09]",
                      "from-[#1a1917] via-[#111010] to-[#090908]",
                      "from-[#201e1a] via-[#141312] to-[#0b0a0a]",
                    ][i % 3]
                  }
                />

                <div className="mt-5 flex items-baseline justify-between gap-3 border-t border-white/[0.07] pt-4">
                  <div>
                    <h3 className="font-display text-2xl text-bone">{b.name}</h3>
                    <p className="mt-1 font-body text-[10px] uppercase tracking-widest text-smoke">
                      {barberRole(b, lang)}
                    </p>
                  </div>
                  <span className="font-body text-[10px] tracking-widest text-brass/70">
                    {String(i + 1).padStart(2, "0")}
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
