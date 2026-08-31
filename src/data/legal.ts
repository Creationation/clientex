import { SALON } from "./salon";

/**
 * Textes legaux. En Autriche l'Impressum (par. 5 ECG, par. 24 MedienG) et la
 * declaration de protection des donnees sont obligatoires et doivent etre
 * redigees en allemand.
 *
 * ATTENTION : les valeurs marquees [ZU ERGANZEN] doivent etre fournies par le
 * client avant la mise en ligne. Ne pas publier le site sans les avoir remplies.
 */

export const IMPRESSUM: { title: string; body: string[] }[] = [
  {
    title: "Medieninhaber und Diensteanbieter",
    body: [
      `${SALON.legalName}`,
      `${SALON.street}, ${SALON.postalCode} ${SALON.city}, ${SALON.countryName}`,
      `Telefon: ${SALON.phone}`,
      `E-Mail: ${SALON.email}`,
    ],
  },
  {
    title: "Unternehmensgegenstand",
    body: ["Friseur- und Barbierdienstleistungen (Herrenfriseur)."],
  },
  {
    title: "Rechtsform und Firmenbuch",
    body: [
      "Rechtsform: [ZU ERGANZEN]",
      "Firmenbuchnummer: [ZU ERGANZEN]",
      "Firmenbuchgericht: [ZU ERGANZEN]",
      "UID-Nummer: [ZU ERGANZEN]",
      "Geschaftsfuhrung / Inhaber: [ZU ERGANZEN]",
    ],
  },
  {
    title: "Gewerbebehorde und Kammer",
    body: [
      "Mitglied der Wirtschaftskammer Wien, Fachgruppe der Friseure (Stylisten).",
      "Gewerbebehorde: Magistratisches Bezirksamt fur den 22. Bezirk.",
      "Anwendbare Rechtsvorschrift: Gewerbeordnung (GewO), abrufbar unter www.ris.bka.gv.at.",
    ],
  },
  {
    title: "Online-Streitbeilegung",
    body: [
      "Die Europaische Kommission stellt eine Plattform zur Online-Streitbeilegung bereit: https://ec.europa.eu/consumers/odr",
      "Wir sind weder verpflichtet noch bereit, an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.",
    ],
  },
  {
    title: "Haftung fur Inhalte",
    body: [
      "Die Inhalte dieser Website wurden mit grosster Sorgfalt erstellt. Fur die Richtigkeit, Vollstandigkeit und Aktualitat der Inhalte konnen wir jedoch keine Gewahr ubernehmen.",
      "Fur Inhalte externer Links ist ausschliesslich deren Betreiber verantwortlich.",
    ],
  },
  {
    title: "Umsetzung",
    body: ["Konzeption und Umsetzung: Creationation, Wien."],
  },
];

export const DATENSCHUTZ: { title: string; body: string[] }[] = [
  {
    title: "Verantwortlicher",
    body: [
      `${SALON.legalName}, ${SALON.street}, ${SALON.postalCode} ${SALON.city}`,
      `Telefon: ${SALON.phone} · E-Mail: ${SALON.email}`,
      "Verantwortlich im Sinne der Datenschutz-Grundverordnung (DSGVO).",
    ],
  },
  {
    title: "Welche Daten wir verarbeiten",
    body: [
      "Terminbuchung: Vor- und Nachname, E-Mail-Adresse, Telefonnummer, gewahlte Leistung, gewahlter Barbier, Datum und Uhrzeit sowie eine freiwillige Anmerkung.",
      "Technische Daten: beim Aufruf der Website werden vom Hosting-Anbieter kurzzeitig Server-Logdaten verarbeitet (IP-Adresse, Zeitpunkt, aufgerufene Seite, Browsertyp).",
    ],
  },
  {
    title: "Zweck und Rechtsgrundlage",
    body: [
      "Die Daten der Terminbuchung werden ausschliesslich zur Durchfuhrung und Bestatigung des Termins verarbeitet. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertrag beziehungsweise vorvertragliche Massnahme).",
      "Die technischen Logdaten dienen dem sicheren Betrieb der Website. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse).",
    ],
  },
  {
    title: "Empfanger und Auftragsverarbeiter",
    body: [
      "Supabase (Datenbank und Serverfunktionen), Resend (Versand der Bestatigungs-E-Mail), Vercel (Hosting) und Telegram (interne Benachrichtigung des Salons).",
      "Mit diesen Anbietern bestehen Auftragsverarbeitungsvertrage. Eine Ubermittlung erfolgt ausschliesslich zweckgebunden.",
    ],
  },
  {
    title: "Speicherdauer",
    body: [
      "Buchungsdaten werden fur die Dauer der Geschaftsbeziehung und darueber hinaus im Rahmen der gesetzlichen Aufbewahrungsfristen gespeichert und danach geloscht.",
    ],
  },
  {
    title: "Cookies",
    body: [
      "Diese Website setzt keine Marketing- oder Tracking-Cookies ein. Gespeichert wird lediglich die gewahlte Sprache im lokalen Speicher des Browsers. Diese Information verlasst dein Gerat nicht.",
    ],
  },
  {
    title: "Google Maps",
    body: [
      "Auf der Kontaktseite ist eine Karte von Google Maps eingebettet. Beim Laden der Karte wird deine IP-Adresse an Google ubertragen. Anbieter: Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland.",
    ],
  },
  {
    title: "Deine Rechte",
    body: [
      "Du hast das Recht auf Auskunft, Berichtigung, Loschung, Einschrankung der Verarbeitung, Datenubertragbarkeit und Widerspruch.",
      "Wende dich dafur formlos an die oben genannte E-Mail-Adresse.",
      "Beschwerdestelle: Osterreichische Datenschutzbehorde, Barichgasse 40-42, 1030 Wien, dsb@dsb.gv.at.",
    ],
  },
];
