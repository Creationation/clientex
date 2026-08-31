import { useLanguage } from "@/contexts/LanguageContext";
import { LANGS, LANG_FLAG, LANG_LABEL, LANG_NAME } from "@/i18n";
import { cn } from "@/lib/utils";

/**
 * Selecteur de langue avec de vrais drapeaux (flagcdn.com, images PNG
 * servies par un CDN public) plutot que des emojis, dont le rendu varie
 * beaucoup selon le systeme et qui n'apparaissent pas du tout sur Windows.
 * Allemand = drapeau autrichien : le salon est viennois.
 */
export default function LanguageSwitcher({ tone = "light" }: { tone?: "light" | "dark" }) {
  const { lang, setLang } = useLanguage();

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-full border p-1",
        tone === "dark" ? "border-paper/25 bg-carbon/40" : "border-carbon/12 bg-white",
      )}
    >
      {LANGS.map((l) => {
        const active = lang === l;
        return (
          <button
            key={l}
            onClick={() => setLang(l)}
            title={LANG_NAME[l]}
            aria-label={LANG_NAME[l]}
            aria-pressed={active}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2.5 py-1.5 transition-all duration-200",
              active
                ? tone === "dark"
                  ? "bg-paper text-carbon"
                  : "bg-carbon text-paper"
                : tone === "dark"
                  ? "text-paper/70 hover:bg-paper/10"
                  : "text-stone hover:bg-carbon/[0.06]",
            )}
          >
            <img
              src={`https://flagcdn.com/w40/${LANG_FLAG[l]}.png`}
              srcSet={`https://flagcdn.com/w80/${LANG_FLAG[l]}.png 2x`}
              width={20}
              height={15}
              alt=""
              className={cn(
                "h-[13px] w-[19px] rounded-[2px] object-cover transition-opacity",
                active ? "opacity-100" : "opacity-70",
              )}
              loading="lazy"
            />
            <span className="font-body text-[10px] font-semibold tracking-widest">
              {LANG_LABEL[l]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
