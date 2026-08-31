import { useLanguage } from "@/contexts/LanguageContext";
import { Photo, Reveal, SectionHead } from "@/components/ui/Primitives";
import { GALLERY, MEDIA } from "@/data/seed";
import { cn } from "@/lib/utils";

type CaptionKey = keyof ReturnType<typeof useLanguage>["t"]["gallery"]["captions"];

export default function Gallery() {
  const { t } = useLanguage();

  return (
    <section id="salon" className="border-t border-carbon/10 bg-paper-soft py-24 md:py-32">
      <div className="container">
        <div className="grid items-end gap-8 md:grid-cols-[1.2fr_0.8fr]">
          <SectionHead eyebrow={t.gallery.eyebrow} title={t.gallery.title} sub={t.gallery.sub} />
          <Reveal delay={120} className="hidden md:block">
            <div className="overflow-hidden rounded-3xl">
              <img
                src={MEDIA.craft}
                alt={t.gallery.captions.razor}
                loading="lazy"
                className="h-[220px] w-full object-cover"
              />
            </div>
          </Reveal>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
          {GALLERY.map((g, i) => (
            <Reveal
              key={g.id}
              delay={i * 60}
              className={cn(i === 0 && "col-span-2 md:col-span-2 md:row-span-1")}
            >
              <figure className="group relative">
                <Photo
                  src={g.src}
                  alt={t.gallery.captions[g.captionKey as CaptionKey]}
                  ratio={i === 0 ? "aspect-[16/10]" : "aspect-[4/5]"}
                />
                <figcaption className="pointer-events-none absolute bottom-3 left-4 font-body text-[11px] font-semibold uppercase tracking-widest text-paper opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  {t.gallery.captions[g.captionKey as CaptionKey]}
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
