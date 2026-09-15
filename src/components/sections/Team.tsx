import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNextAvailability } from "@/hooks/useNextAvailability";
import { Photo, Reveal, SectionHead } from "@/components/ui/Primitives";
import type { Barber, BarberHour, OpeningHour, Service, Settings } from "@/data/types";
import type { NextSlot } from "@/lib/slots";
import { addDays, fromDateKey, toDateKey } from "@/lib/utils";

export function barberRole(b: Barber, lang: string): string {
  return lang === "en" ? b.role_en || b.role_de : b.role_de;
}

export default function Team({
  barbers,
  services,
  openingHours,
  barberHours,
  settings,
}: {
  barbers: Barber[];
  services: Service[];
  openingHours: OpeningHour[];
  barberHours: BarberHour[];
  settings: Settings;
}) {
  const { t, lang } = useLanguage();

  // Prochain creneau pour la prestation la plus courte : c'est l'information
  // la plus honnete a afficher sans connaitre le choix du client.
  const shortest = services.reduce((min, s) => Math.min(min, s.duration_min), Infinity);
  const nextFree = useNextAvailability(
    barbers,
    openingHours,
    barberHours,
    settings,
    Number.isFinite(shortest) ? shortest : 30,
  );

  const label = (n: NextSlot | null | undefined): string | null => {
    if (n === undefined) return null;
    if (n === null) return t.team.noneSoon;
    const today = toDateKey(new Date());
    const tomorrow = toDateKey(addDays(new Date(), 1));
    const day =
      n.date === today
        ? t.team.today
        : n.date === tomorrow
          ? t.team.tomorrow
          : fromDateKey(n.date).toLocaleDateString(lang, { weekday: "short", day: "2-digit", month: "2-digit" });
    return `${day} · ${n.time}`;
  };

  return (
    <section id="team" className="border-t border-carbon/10 bg-paper py-24 md:py-32">
      <div className="container">
        <SectionHead eyebrow={t.team.eyebrow} title={t.team.title} sub={t.team.sub} align="center" />

        <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {barbers.map((b, i) => {
            const next = label(nextFree[b.id]);
            return (
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
                    <div className="min-w-0">
                      <h3 className="font-display text-[22px] font-semibold text-carbon">{b.name}</h3>
                      <p className="mt-0.5 font-body text-[12px] text-stone">
                        {barberRole(b, lang)}
                      </p>
                      {next ? (
                        <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-paper-soft px-2.5 py-1 font-body text-[11px] font-medium text-carbon">
                          <span className="h-1.5 w-1.5 rounded-full bg-success" />
                          <span className="text-stone">{t.team.nextFree}:</span> {next}
                        </p>
                      ) : null}
                    </div>
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-carbon/15 text-carbon transition-colors group-hover:bg-carbon group-hover:text-paper">
                      <ArrowUpRight size={15} />
                    </span>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
