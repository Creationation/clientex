import { useLanguage } from "@/contexts/LanguageContext";
import { ArchFrame, Reveal, SectionHead } from "@/components/ui/Primitives";
import { GALLERY } from "@/data/seed";

type CaptionKey = keyof ReturnType<typeof useLanguage>["t"]["gallery"]["captions"];

export default function Gallery() {
  const { t } = useLanguage();

  return (
    <section id="salon" className="relative overflow-hidden border-t border-white/[0.07] py-28 md:py-36">
      <div className="pointer-events-none absolute -left-32 top-1/3 h-[420px] w-[420px] rounded-full bg-brass/[0.05] blur-[130px]" />

      <div className="container relative">
        <SectionHead eyebrow={t.gallery.eyebrow} title={t.gallery.title} sub={t.gallery.sub} />

        <div className="mt-16 grid grid-cols-2 gap-5 md:grid-cols-3 md:gap-8">
          {GALLERY.map((g, i) => (
            <Reveal
              key={g.id}
              delay={i * 70}
              className={i === 0 ? "col-span-2 md:col-span-1" : undefined}
            >
              <ArchFrame
                index={i + 1}
                tone={g.tone}
                ratio={i === 0 ? "aspect-[4/3] md:aspect-[3/4]" : "aspect-[3/4]"}
                label={t.gallery.captions[g.captionKey as CaptionKey]}
              />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
