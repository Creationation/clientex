import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { dictionaries, type Dictionary } from "@/i18n";
import type { Lang } from "@/data/types";

const STORAGE_KEY = "delherren_lang";

interface LanguageValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Dictionary;
}

const LanguageContext = createContext<LanguageValue | null>(null);

function detectLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "de" || stored === "en") return stored;
  } catch {
    /* navigation privee */
  }
  // Le salon est viennois : l'allemand est la langue par defaut, quelle que
  // soit la langue du navigateur. Le visiteur bascule lui-meme s'il le veut.
  return "de";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLang);

  useEffect(() => {
    document.documentElement.lang = lang;
    const dict = dictionaries[lang];
    document.title = dict.meta.title;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", dict.meta.description);
  }, [lang]);

  const value = useMemo<LanguageValue>(
    () => ({
      lang,
      setLang: (next: Lang) => {
        try {
          localStorage.setItem(STORAGE_KEY, next);
        } catch {
          /* ignore */
        }
        setLangState(next);
      },
      t: dictionaries[lang],
    }),
    [lang],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) return { lang: "de", setLang: () => {}, t: dictionaries.de };
  return ctx;
}
