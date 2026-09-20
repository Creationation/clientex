/**
 * Fiche etablissement. Source unique pour le SEO, le JSON-LD, le footer,
 * les emails et le fichier .ics. Un seul endroit a mettre a jour.
 */
export const SALON = {
  name: "DEL Herren Friseur Barber Shop",
  shortName: "DEL Herren",
  legalName: "DEL Herren Friseur Barber Shop",
  street: "Erzherzog-Karl-Strasse 60",
  postalCode: "1220",
  city: "Wien",
  country: "AT",
  countryName: "Osterreich",
  phone: "+43 660 87511680",
  phoneHref: "tel:+4366087511680",
  whatsapp: "https://wa.me/4366087511680",
  email: "termin@delherren.app",
  instagram: "https://www.instagram.com/del_herren_friseur",
  rating: 4.9,
  reviewCount: 262,
  lat: 48.2299,
  lng: 16.4626,
  mapsEmbed:
    "https://www.google.com/maps?q=Erzherzog-Karl-Stra%C3%9Fe%2060%2C%201220%20Wien&output=embed",
  mapsLink:
    "https://www.google.com/maps/search/?api=1&query=Erzherzog-Karl-Stra%C3%9Fe+60,+1220+Wien",
  siteUrl: (import.meta.env.VITE_SITE_URL as string) || "https://delherren.app",
  priceRange: "EUR 7 - 33",
  /** Lien "Bewertung schreiben". A remplacer par le lien court de la fiche Google Business. */
  reviewUrl:
    (import.meta.env.VITE_GOOGLE_REVIEW_URL as string) ||
    "https://www.google.com/search?q=DEL+Herren+Friseur+Barber+Shop+Avis&si=APenkKm7iecQ4G6P-TsbSMFKIQtv3EFIqRAFw-i8uEbk55Z-_2uvkiuk7au4n40XvHyBWJhhUV3yo94MGDm8D4xMJQKXwkzCDPS9-hAfwijMys90jwTzTz0OIDEBVgCVPGh8vHLuHYzYUBNXnytPvlbdlYv0rY-26A%3D%3D",
} as const;

export const SALON_ADDRESS_LINE = `${SALON.street}, ${SALON.postalCode} ${SALON.city}`;
