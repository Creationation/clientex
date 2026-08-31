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
    <div className="min-h-screen bg-paper">
      <header className="border-b border-carbon/10">
        <div className="container flex items-center justify-between py-5">
          <Link to="/">
            <Wordmark />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-carbon/15 px-4 py-2 font-body text-[12px] font-medium text-stone transition-colors hover:text-carbon"
          >
            <ArrowLeft size={14} /> {t.legal.back}
          </Link>
        </div>
      </header>

      <main className="container max-w-3xl py-14 md:py-20">
        <span className="rule-left block" />
        <h1 className="mt-5 font-display text-[clamp(2rem,5vw,2.9rem)] font-semibold text-carbon">
          {title}
        </h1>

        <div className="mt-12 space-y-10">
          {sections.map((s) => (
            <section key={s.title} className="rounded-2xl border border-carbon/10 bg-white p-6">
              <h2 className="font-body text-[10px] font-semibold uppercase tracking-brand text-brass">
                {s.title}
              </h2>
              <div className="mt-3 space-y-2">
                {s.body.map((line, i) => (
                  <p key={i} className="text-[14px] leading-relaxed text-stone">
                    {line}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-12">
          <Link to="/" className="btn-ghost">
            {t.legal.back}
          </Link>
        </div>
      </main>
    </div>
  );
}
