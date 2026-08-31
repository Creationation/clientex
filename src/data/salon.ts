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
  phoneHref: "tel:+436608751168",
  whatsapp: "https://wa.me/436608751168",
  email: "termin@delherren.app",
  instagram: "",
  rating: 4.9,
  reviewCount: 256,
  lat: 48.2299,
  lng: 16.4626,
  mapsEmbed:
    "https://www.google.com/maps?q=Erzherzog-Karl-Stra%C3%9Fe%2060%2C%201220%20Wien&output=embed",
  mapsLink:
    "https://www.google.com/maps/search/?api=1&query=Erzherzog-Karl-Stra%C3%9Fe+60,+1220+Wien",
  siteUrl: (import.meta.env.VITE_SITE_URL as string) || "https://delherren.app",
  priceRange: "EUR 8 - 38",
} as const;

export const SALON_ADDRESS_LINE = `${SALON.street}, ${SALON.postalCode} ${SALON.city}`;
