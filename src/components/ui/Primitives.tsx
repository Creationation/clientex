import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useReveal } from "@/hooks/useReveal";

/** Bloc qui apparait au scroll. */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-700 ease-out will-change-transform",
        visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
        className,
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/** En-tete de section : surtitre bronze, titre Fraunces, sous-titre. */
export function SectionHead({
  eyebrow,
  title,
  sub,
  align = "left",
  tone = "light",
  className,
}: {
  eyebrow: string;
  title: ReactNode;
  sub?: string;
  align?: "left" | "center";
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <Reveal className={cn(align === "center" && "text-center", className)}>
      <div className={cn("flex items-center gap-3", align === "center" && "justify-center")}>
        <span className={cn("rule-left", tone === "dark" && "bg-paper/50")} />
        <span className={cn("eyebrow", tone === "dark" && "text-paper/70")}>{eyebrow}</span>
      </div>
      <h2
        className={cn(
          "mt-4 font-display text-[clamp(2rem,4.6vw,3.2rem)] leading-[1.08] text-balance",
          tone === "dark" ? "text-paper" : "text-carbon",
        )}
      >
        {title}
      </h2>
      {sub ? (
        <p
          className={cn(
            "mt-4 max-w-xl text-[15px] leading-relaxed",
            tone === "dark" ? "text-paper/70" : "text-stone",
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
 * Photo cadree. `arch` reprend la forme des miroirs du salon.
 * Le fallback (monogramme) sert tant qu'une photo n'a pas ete fournie.
 */
export function Photo({
  src,
  alt,
  monogram,
  arch = false,
  ratio = "aspect-[4/5]",
  className,
  overlay = true,
}: {
  src?: string | null;
  alt: string;
  monogram?: string;
  arch?: boolean;
  ratio?: string;
  className?: string;
  overlay?: boolean;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden bg-paper-deep",
        arch ? "arch" : "rounded-2xl",
        ratio,
        className,
      )}
    >
      {src ? (
        <>
          <img
            src={src}
            alt={alt}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-[1100ms] ease-out group-hover:scale-[1.05]"
          />
          {overlay ? (
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-carbon/35 via-transparent to-transparent" />
          ) : null}
        </>
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-paper-deep">
          <span className="font-display text-[clamp(2.5rem,7vw,4rem)] leading-none text-carbon/20">
            {monogram ?? "DEL"}
          </span>
        </div>
      )}
    </div>
  );
}

export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("chip", className)}>{children}</span>;
}
