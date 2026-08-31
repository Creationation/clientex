import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1.5rem", screens: { "2xl": "1320px" } },
    extend: {
      fontFamily: {
        display: ['"Bodoni Moda"', "Georgia", "serif"],
        body: ['"Jost"', "system-ui", "sans-serif"],
      },
      colors: {
        ink: {
          DEFAULT: "hsl(var(--ink))",
          soft: "hsl(var(--ink-soft))",
          raised: "hsl(var(--ink-raised))",
        },
        brass: {
          DEFAULT: "hsl(var(--brass))",
          light: "hsl(var(--brass-light))",
          dark: "hsl(var(--brass-dark))",
        },
        bone: "hsl(var(--bone))",
        smoke: "hsl(var(--smoke))",
        line: "hsl(var(--line))",
        background: "hsl(var(--ink))",
        foreground: "hsl(var(--bone))",
        destructive: "hsl(var(--destructive))",
        success: "hsl(var(--success))",
      },
      borderRadius: { none: "0", sm: "2px", DEFAULT: "3px", md: "4px", arch: "999px 999px 0 0" },
      letterSpacing: { widest: "0.28em", brand: "0.42em" },
      boxShadow: {
        lift: "0 24px 60px -24px rgba(0,0,0,0.85)",
      },
      backgroundImage: {
        // Fond marbre : uniquement des gris chauds, aucune teinte doree.
        marble:
          "radial-gradient(120% 90% at 14% 6%, hsl(30 6% 11%) 0%, transparent 58%), radial-gradient(90% 70% at 88% 18%, hsl(30 5% 9%) 0%, transparent 62%), radial-gradient(140% 120% at 50% 118%, hsl(30 6% 7%) 0%, transparent 60%)",
      },
      keyframes: {
        "rise": { from: { opacity: "0", transform: "translateY(18px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "fade": { from: { opacity: "0" }, to: { opacity: "1" } },
        "grain": { "0%,100%": { transform: "translate(0,0)" }, "50%": { transform: "translate(-2%,1%)" } },
      },
      animation: {
        rise: "rise 0.9s cubic-bezier(0.16,1,0.3,1) both",
        fade: "fade 1.2s ease both",
        grain: "grain 8s steps(2) infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
