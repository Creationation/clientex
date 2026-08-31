import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1.5rem", screens: { "2xl": "1280px" } },
    extend: {
      fontFamily: {
        // Fraunces : serif optique a contraste modere. Les pleins tiennent a
        // toutes les tailles, contrairement a un Didone dont les delies
        // disparaissent a l'ecran.
        display: ["Fraunces", "Georgia", "serif"],
        body: ["Manrope", "system-ui", "sans-serif"],
      },
      colors: {
        paper: {
          DEFAULT: "hsl(var(--paper))",
          soft: "hsl(var(--paper-soft))",
          deep: "hsl(var(--paper-deep))",
        },
        carbon: {
          DEFAULT: "hsl(var(--carbon))",
          soft: "hsl(var(--carbon-soft))",
        },
        stone: "hsl(var(--stone))",
        brass: {
          DEFAULT: "hsl(var(--brass))",
          light: "hsl(var(--brass-light))",
        },
        destructive: "hsl(var(--destructive))",
        success: "hsl(var(--success))",
      },
      borderRadius: {
        sm: "0.5rem",
        DEFAULT: "0.75rem",
        md: "0.875rem",
        lg: "1.125rem",
        xl: "1.5rem",
        "2xl": "1.75rem",
        "3xl": "2.25rem",
      },
      letterSpacing: { widest: "0.2em", brand: "0.32em" },
      boxShadow: {
        soft: "0 1px 2px rgba(33,31,28,0.04), 0 12px 32px -18px rgba(33,31,28,0.22)",
        lift: "0 2px 6px rgba(33,31,28,0.06), 0 26px 56px -26px rgba(33,31,28,0.32)",
      },
      keyframes: {
        rise: { from: { opacity: "0", transform: "translateY(16px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        fade: { from: { opacity: "0" }, to: { opacity: "1" } },
      },
      animation: {
        rise: "rise 0.8s cubic-bezier(0.16,1,0.3,1) both",
        fade: "fade 1.1s ease both",
      },
    },
  },
  plugins: [],
} satisfies Config;
