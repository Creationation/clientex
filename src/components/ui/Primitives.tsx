import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useReveal } from "@/hooks/useReveal";

/** Bloc qui apparait au scroll. */
export function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section" | "li" | "article";
}) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <Tag
      ref={ref as never}
      className={cn(
        "transition-all duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform",
        visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0",
        className,
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}

/** En-tete de section : surtitre laiton, filet, titre Bodoni, sous-titre. */
export function SectionHead({
  eyebrow,
  title,
  sub,
  align = "left",
  className,
}: {
  eyebrow: string;
  title: ReactNode;
  sub?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <Reveal className={cn(align === "center" && "text-center", className)}>
      <div className={cn("flex items-center gap-4", align === "center" && "justify-center")}>
        <span className="rule-left" />
        <span className="eyebrow">{eyebrow}</span>
      </div>
      <h2 className="mt-5 font-display text-[clamp(2.1rem,5.5vw,3.6rem)] leading-[1.05] text-balance">
        {title}
      </h2>
      {sub ? (
        <p
          className={cn(
            "mt-5 max-w-xl text-[15px] font-light leading-relaxed text-smoke",
            align === "center" && "mx-auto",
          )}
        >
          {sub}
        </p>
      ) : null}
    </Reveal>
  );
}

/**
 * Cadre en arche, echo des miroirs arche du salon.
 * Tant que les photos HD ne sont pas fournies, il rend un degrade travaille
 * plutot qu'une image cassee.
 */
export function ArchFrame({
  label,
  index,
  tone = "from-[#171410] to-[#050505]",
  src,
  ratio = "aspect-[3/4]",
  className,
}: {
  label?: string;
  index?: number;
  tone?: string;
  src?: string | null;
  ratio?: string;
  className?: string;
}) {
  return (
    <div className={cn("group relative", className)}>
      <div
        className={cn(
          "arch relative overflow-hidden border border-white/10 bg-gradient-to-b",
          tone,
          ratio,
        )}
      >
        {src ? (
          <img
            src={src}
            alt={label ?? ""}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-[1200ms] group-hover:scale-[1.06]"
          />
        ) : (
          <Ornament index={index} />
        )}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,transparent_35%,rgba(0,0,0,0.75)_100%)]" />
        <div className="pointer-events-none absolute inset-[10px] rounded-[inherit] border border-brass/20" />
      </div>
      {label ? (
        <div className="mt-4 flex items-baseline justify-between gap-3">
          <span className="font-display text-sm tracking-wide text-bone">{label}</span>
          {typeof index === "number" ? (
            <span className="font-body text-[10px] tracking-widest text-brass/70">
              {String(index).padStart(2, "0")}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Motif laiton dessine en SVG, utilise a la place des photos manquantes. */
function Ornament({ index = 0 }: { index?: number }) {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <svg viewBox="0 0 200 260" className="h-[62%] w-auto opacity-[0.5]" aria-hidden="true">
        <defs>
          <linearGradient id={`br-${index}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(41 62% 32%)" />
            <stop offset="45%" stopColor="hsl(44 78% 66%)" />
            <stop offset="100%" stopColor="hsl(46 71% 40%)" />
          </linearGradient>
        </defs>
        <path
          d="M100 12c30 0 54 24 54 54v150c0 8-6 14-14 14H60c-8 0-14-6-14-14V66c0-30 24-54 54-54z"
          fill="none"
          stroke={`url(#br-${index})`}
          strokeWidth="1.1"
        />
        <path
          d="M100 40c18 0 32 14 32 32v120H68V72c0-18 14-32 32-32z"
          fill="none"
          stroke={`url(#br-${index})`}
          strokeWidth="0.7"
          opacity="0.55"
        />
        <circle cx="100" cy="132" r="26" fill="none" stroke={`url(#br-${index})`} strokeWidth="0.7" />
        <path d="M100 106v52M74 132h52" stroke={`url(#br-${index})`} strokeWidth="0.6" opacity="0.7" />
      </svg>
    </div>
  );
}

export function Monogram({ text, className }: { text: string; className?: string }) {
  return (
    <span
      className={cn(
        "brass-text font-display text-[clamp(2.5rem,7vw,4rem)] leading-none",
        className,
      )}
    >
      {text}
    </span>
  );
}

export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 border border-brass/30 px-3 py-1.5 font-body text-[10px] uppercase tracking-widest text-brass",
        className,
      )}
    >
      {children}
    </span>
  );
}
