import type { Lang } from "./types";

/**
 * Avis Google du salon, releves le 17 septembre 2026 (4,9 sur 5, 262 avis).
 * Uniquement des 5 etoiles, dans la langue d'origine : les avis allemands
 * sur le site allemand, les anglais sur le site anglais. Texte repris tel
 * quel, a la ponctuation pres.
 */
export interface Review {
  name: string;
  text: string;
}

export const REVIEWS: Record<Lang, Review[]> = {
  de: [
    {
      name: "Linus Fraundorfer",
      text: "Bester Barber, egal ob Mustafa oder Chef, beide schneiden super und sind extrem freundlich! Ab jetzt nur mehr hier.",
    },
    {
      name: "Daniel A.",
      text: "Einer der besten Friseure, wo ich bis jetzt in Wien war. Der Besitzer ist so nett und ich brauch nur noch sagen: bitte so wie immer schneiden.",
    },
    {
      name: "Mohamad Altawil",
      text: "Großartiger Haarschnitt. Der Friseur nimmt sich viel Zeit und ist ein Meister seines Handwerks. Sehr schönes Ambiente, man fühlt sich wohl.",
    },
    {
      name: "Günther Hruza",
      text: "Heute das erste Mal bei diesem Friseur und sicher nicht das letzte Mal. Hier wird Friseurkunst noch mit Liebe und Perfektion betrieben.",
    },
    {
      name: "Antonius Hanna",
      text: "Sehr guter und professioneller Friseur! Mit Termin keine Wartezeit! Transparente Preise!",
    },
    {
      name: "Daniel",
      text: "Wenig Wartezeit, die Friseure sind freundlich und engagiert, super Haarschnitt für den Preis. Top Preis-Leistung.",
    },
    {
      name: "PumpK1N6",
      text: "Komme jedes Mal ohne Termin und bin schnell wieder fertig. Bin schon lange hier und immer zufrieden! Auch mein Sohn freut sich jedes Mal.",
    },
    {
      name: "Darko Jovanovic",
      text: "Bin seit Jänner 2022, als er eröffnet hat, Kunde und kann nur sagen, dass er immer noch sehr bemüht ist. Spitzen Friseur.",
    },
    {
      name: "Stanley Pop",
      text: "Angestellte und Inhaber sind sehr höflich und nett, schneller Service, guter Preis. Gehe nur noch hier hin.",
    },
    {
      name: "Fahad bin Saalim Baig",
      text: "Super Barber! Sehr freundlich und professionell. Der Haarschnitt war top, genau wie gewünscht.",
    },
    {
      name: "Adrian Mandic",
      text: "Bester Frisör in 1220, kann ich nur weiterempfehlen. Sehr nettes Personal.",
    },
    {
      name: "Norbert Urban",
      text: "Immer sehr freundlich, geht auf Wünsche ein. Sehr zufrieden. Gerne immer wieder.",
    },
  ],
  en: [
    { name: "Yousef Balfakeih", text: "The best hairdresser I know! Definitely recommend!!" },
    { name: "Granit Caka", text: "Amazing work, and a master at what he does!" },
    { name: "Daniel Hobel", text: "The best men's hairdresser in Vienna!!!" },
    { name: "Usman Badshah", text: "Perfect. Nice people. Love to be here again." },
    { name: "Mihaly Szolnoki", text: "Nice place. Quick, cheap and good work." },
    { name: "Qadargul Utmanzai", text: "Good haircut shop, I cut my hair every time here." },
  ],
};
