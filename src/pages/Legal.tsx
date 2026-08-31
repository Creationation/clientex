import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { DATENSCHUTZ, IMPRESSUM } from "@/data/legal";
import { Wordmark } from "@/components/Header";

export default function Legal({ kind }: { kind: "impressum" | "datenschutz" }) {
  const { t } = useLanguage();
  const sections = kind === "impressum" ? IMPRESSUM : DATENSCHUTZ;
  const title = kind === "impressum" ? t.legal.impressumTitle : t.legal.datenschutzTitle;

  return (
    <div className="min-h-screen bg-ink">
      <header className="border-b border-white/10">
        <div className="container flex items-center justify-between py-6">
          <Link to="/">
            <Wordmark />
          </Link>
          <Link
            to="/"
            className="flex items-center gap-2 font-body text-[11px] uppercase tracking-widest text-smoke transition-colors hover:text-brass"
          >
            <ArrowLeft size={14} /> {t.legal.back}
          </Link>
        </div>
      </header>

      <main className="container max-w-3xl py-16 md:py-24">
        <span className="rule-left block" />
        <h1 className="mt-6 font-display text-[clamp(2.2rem,6vw,3.4rem)] text-bone">{title}</h1>

        <div className="mt-14 space-y-12">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="font-body text-[10px] uppercase tracking-brand text-brass">
                {s.title}
              </h2>
              <div className="mt-4 space-y-2.5">
                {s.body.map((line, i) => (
                  <p key={i} className="text-sm font-light leading-relaxed text-smoke">
                    {line}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-16 border-t border-white/10 pt-8">
          <Link to="/" className="btn-ghost">
            {t.legal.back}
          </Link>
        </div>
      </main>
    </div>
  );
}
