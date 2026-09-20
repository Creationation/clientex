import { useState } from "react";
import { ExternalLink, Star } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Reveal, SectionHead } from "@/components/ui/Primitives";
import { REVIEWS } from "@/data/reviews";
import { SALON } from "@/data/salon";

const INITIAL = 6;

/** Avis Google, dans la langue du site. Cinq etoiles uniquement, texte d'origine. */
export default function Reviews() {
  const { t, lang } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const all = REVIEWS[lang];
  const shown = expanded ? all : all.slice(0, INITIAL);

  return (
    <section id="bewertungen" className="border-t border-carbon/10 bg-paper py-24 md:py-32">
      <div className="container">
        <div className="grid items-end gap-8 md:grid-cols-[1.2fr_0.8fr]">
          <SectionHead eyebrow={t.reviews.eyebrow} title={t.reviews.title} sub={t.reviews.sub} />
          <Reveal delay={120}>
            <a
              href={SALON.mapsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between gap-4 rounded-3xl border border-carbon/10 bg-white p-6 shadow-soft transition-shadow hover:shadow-lift"
            >
              <span>
                <span className="flex items-center gap-2">
                  <span className="font-display text-[40px] font-semibold leading-none text-carbon">
                    {SALON.rating.toLocaleString(lang)}
                  </span>
                  <span className="flex text-brass">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <Star key={i} size={16} className="fill-current" />
                    ))}
                  </span>
                </span>
                <span className="mt-2 block font-body text-[12px] font-semibold uppercase tracking-widest text-stone">
                  {SALON.reviewCount} {t.hero.reviews} · Google
                </span>
              </span>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-carbon/15 text-carbon transition-colors group-hover:bg-carbon group-hover:text-paper">
                <ExternalLink size={15} />
              </span>
            </a>
          </Reveal>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3 md:gap-5">
          {shown.map((r, i) => (
            <Reveal key={r.name + i} delay={(i % INITIAL) * 60}>
              <figure className="flex h-full flex-col rounded-3xl border border-carbon/10 bg-white p-6">
                <span className="flex text-brass">
                  {[0, 1, 2, 3, 4].map((k) => (
                    <Star key={k} size={13} className="fill-current" />
                  ))}
                </span>
                <blockquote className="mt-4 flex-1 font-display text-[17px] leading-relaxed text-carbon">
                  {r.text}
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3 border-t border-carbon/10 pt-4">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-paper-soft font-body text-[12px] font-semibold text-carbon">
                    {r.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="font-body text-[13px] font-medium text-carbon">{r.name}</span>
                  <span className="ml-auto font-body text-[10px] font-semibold uppercase tracking-widest text-stone">
                    Google
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>

        {all.length > INITIAL ? (
          <div className="mt-8 flex justify-center">
            <button onClick={() => setExpanded((v) => !v)} className="btn-ghost">
              {expanded ? t.reviews.showLess : t.reviews.showMore}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
