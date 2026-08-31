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
                <div className="relative">
                  <ArchFrame
                    ratio="aspect-[3/4]"
                    index={i + 1}
                    src={b.image_url}
                    tone={
                      ["from-[#181410] to-[#050505]", "from-[#151310] to-[#040404]", "from-[#1a1611] to-[#060606]"][
                        i % 3
                      ]
                    }
                  />
                  {!b.image_url ? (
                    <span className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center font-display text-[clamp(3rem,7vw,4.5rem)] text-white/[0.07]">
                      {b.initials}
                    </span>
                  ) : null}
                </div>

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
