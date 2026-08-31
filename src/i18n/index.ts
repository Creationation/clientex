import { de, type Dictionary } from "./de";
import { en } from "./en";
import type { Lang } from "@/data/types";

export const LANGS: Lang[] = ["de", "en"];

export const LANG_LABEL: Record<Lang, string> = { de: "Deutsch", en: "English" };

export const LANG_NAME: Record<Lang, string> = {
  de: "Deutsch",
  en: "English",
};

/** Codes ISO utilises par flagcdn.com. Allemand = Autriche, le salon est viennois. */
export const LANG_FLAG: Record<Lang, string> = { de: "at", en: "gb" };

export const dictionaries: Record<Lang, Dictionary> = { de, en };

export type { Dictionary };
