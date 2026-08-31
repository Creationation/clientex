import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

export default function NotFound() {
  const { t } = useLanguage();
  return (
    <div className="grid min-h-screen place-items-center bg-marble px-6 text-center">
      <div>
        <p className="font-display text-[clamp(5rem,18vw,10rem)] leading-none text-bone/15">404</p>
        <h1 className="mt-4 font-display text-3xl text-bone">{t.notFound.title}</h1>
        <p className="mt-3 text-sm text-smoke">{t.notFound.sub}</p>
        <Link to="/" className="btn-brass mt-9">
          {t.notFound.home}
        </Link>
      </div>
    </div>
  );
}
