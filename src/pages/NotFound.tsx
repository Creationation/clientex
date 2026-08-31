import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Wordmark } from "@/components/Header";

export default function NotFound() {
  const { t } = useLanguage();
  return (
    <div className="grid min-h-screen place-items-center bg-paper px-6 text-center">
      <div>
        <div className="flex justify-center">
          <Wordmark />
        </div>
        <p className="mt-10 font-display text-[clamp(4rem,14vw,8rem)] font-semibold leading-none text-carbon/15">
          404
        </p>
        <h1 className="mt-3 font-display text-[28px] font-semibold text-carbon">
          {t.notFound.title}
        </h1>
        <p className="mt-2 text-[15px] text-stone">{t.notFound.sub}</p>
        <Link to="/" className="btn-solid mt-8">
          {t.notFound.home}
        </Link>
      </div>
    </div>
  );
}
