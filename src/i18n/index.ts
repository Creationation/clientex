import { de, type Dictionary } from "./de";
import { en } from "./en";
import { tr } from "./tr";
import type { Lang } from "@/data/types";

export const LANGS: Lang[] = ["de", "en", "tr"];

export const LANG_LABEL: Record<Lang, string> = {
  de: "DE",
  en: "EN",
  tr: "TR",
};

export const dictionaries: Record<Lang, Dictionary> = { de, en, tr };

export type { Dictionary };
