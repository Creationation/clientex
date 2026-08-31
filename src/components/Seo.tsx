import { useEffect } from "react";
import { SALON } from "@/data/salon";
import type { OpeningHour } from "@/data/types";
import { useLanguage } from "@/contexts/LanguageContext";

const SCHEMA_DAYS = [
  "https://schema.org/Sunday",
  "https://schema.org/Monday",
  "https://schema.org/Tuesday",
  "https://schema.org/Wednesday",
  "https://schema.org/Thursday",
  "https://schema.org/Friday",
  "https://schema.org/Saturday",
];

/**
 * JSON-LD LocalBusiness / HairSalon injecte dynamiquement, alimente par les
 * horaires reels de la base. Un seul bloc, remplace a chaque changement.
 */
export default function Seo({ openingHours }: { openingHours: OpeningHour[] }) {
  const { lang, t } = useLanguage();

  useEffect(() => {
    const schema = {
      "@context": "https://schema.org",
      "@type": ["HairSalon", "LocalBusiness"],
      "@id": `${SALON.siteUrl}/#business`,
      name: SALON.name,
      description: t.meta.description,
      url: SALON.siteUrl,
      telephone: SALON.phone,
      priceRange: SALON.priceRange,
      currenciesAccepted: "EUR",
      image: `${SALON.siteUrl}/og-image.png`,
      address: {
        "@type": "PostalAddress",
        streetAddress: SALON.street,
        addressLocality: SALON.city,
        postalCode: SALON.postalCode,
        addressCountry: SALON.country,
      },
      geo: { "@type": "GeoCoordinates", latitude: SALON.lat, longitude: SALON.lng },
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: SALON.rating,
        reviewCount: SALON.reviewCount,
        bestRating: 5,
      },
      openingHoursSpecification: openingHours
        .filter((h) => h.is_open)
        .map((h) => ({
          "@type": "OpeningHoursSpecification",
          dayOfWeek: SCHEMA_DAYS[h.weekday],
          opens: h.open_time,
          closes: h.close_time,
        })),
      areaServed: { "@type": "City", name: "Wien" },
      potentialAction: {
        "@type": "ReserveAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${SALON.siteUrl}/termin`,
          inLanguage: lang,
          actionPlatform: [
            "https://schema.org/DesktopWebPlatform",
            "https://schema.org/MobileWebPlatform",
          ],
        },
        result: { "@type": "Reservation", name: t.nav.book },
      },
    };

    const id = "delherren-jsonld";
    document.getElementById(id)?.remove();
    const script = document.createElement("script");
    script.id = id;
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);

    return () => {
      document.getElementById(id)?.remove();
    };
  }, [openingHours, lang, t]);

  return null;
}
