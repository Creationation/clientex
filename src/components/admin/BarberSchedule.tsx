import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Barber, BarberAbsence, BarberHour, OpeningHour } from "@/data/types";
import { db } from "@/lib/db";
import { addDays, cn, fromDateKey, toDateKey } from "@/lib/utils";
import { Field } from "./shared";

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

type DayMode = "shop" | "own" | "off";

interface DayDraft {
  weekday: number;
  mode: DayMode;
  start_time: string;
  end_time: string;
}

/**
 * Horaires hebdomadaires et absences d'un barbier.
 * Trois etats par jour : comme le salon (aucune ligne en base), horaires
 * propres (ligne active) ou jour libre (ligne inactive).
 */
export function BarberSchedule({
  barber,
  openingHours,
  barberHours,
  reload,
}: {
  barber: Barber;
  openingHours: OpeningHour[];
  barberHours: BarberHour[];
  reload: () => void;
}) {
  const { t, lang } = useLanguage();
  const [days, setDays] = useState<DayDraft[]>([]);
  const [absences, setAbsences] = useState<BarberAbsence[]>([]);
  const [from, setFrom] = useState(toDateKey(new Date()));
  const [to, setTo] = useState(toDateKey(addDays(new Date(), 7)));
  const [reason, setReason] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDays(
      WEEK_ORDER.map((weekday) => {
        const shop = openingHours.find((h) => h.weekday === weekday);
        const own = barberHours.find((h) => h.barber_id === barber.id && h.weekday === weekday);
        return {
          weekday,
          mode: own ? (own.active ? "own" : "off") : "shop",
          start_time: own?.start_time ?? shop?.open_time ?? "09:00",
          end_time: own?.end_time ?? shop?.close_time ?? "18:00",
        };
      }),
    );
  }, [barber.id, openingHours, barberHours]);

  const loadAbsences = () => {
    const start = toDateKey(addDays(new Date(), -30));
    const end = toDateKey(addDays(new Date(), 365));
    db.listAbsences(start, end)
      .then((all) => setAbsences(all.filter((a) => a.barber_id === barber.id)))
      .catch(() => undefined);
  };

  useEffect(loadAbsences, [barber.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const patch = (weekday: number, p: Partial<DayDraft>) =>
    setDays((d) => d.map((x) => (x.weekday === weekday ? { ...x, ...p } : x)));

  const saveHours = async () => {
    const rows: BarberHour[] = days
      .filter((d) => d.mode !== "shop")
      .map((d) => ({
        barber_id: barber.id,
        weekday: d.weekday,
        active: d.mode === "own",
        start_time: d.start_time,
        end_time: d.end_time,
      }));
    await db.saveBarberHours(barber.id, rows);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
    reload();
  };

  const addAbsence = async () => {
    if (!from || !to || to < from) return;
    await db.createAbsence({ barber_id: barber.id, start_date: from, end_date: to, reason: reason.trim() });
    setReason("");
    loadAbsences();
    reload();
  };

  const shopClosed = (weekday: number) => !openingHours.find((h) => h.weekday === weekday)?.is_open;

  return (
    <div className="mt-4 grid gap-6 border-t border-carbon/10 pt-5 lg:grid-cols-[1.3fr_1fr]">
      <div>
        <h4 className="font-body text-[10px] font-semibold uppercase tracking-brand text-brass">
          {t.admin.schedule}
        </h4>
        <div className="mt-3 space-y-1.5">
          {days.map((d) => (
            <div
              key={d.weekday}
              className={cn(
                "grid items-center gap-2 rounded-xl bg-white px-3 py-2 sm:grid-cols-[92px_auto_1fr]",
                shopClosed(d.weekday) && "opacity-50",
              )}
            >
              <span className="font-body text-[13px] font-medium text-carbon">
                {t.hours.days[d.weekday]}
              </span>
              <div className="flex gap-1">
                {(["shop", "own", "off"] as DayMode[]).map((m) => (
                  <button
                    key={m}
                    disabled={shopClosed(d.weekday)}
                    onClick={() => patch(d.weekday, { mode: m })}
                    className={cn(
                      "rounded-full border px-2.5 py-1 font-body text-[10px] font-semibold uppercase tracking-wider transition-colors",
                      d.mode === m
                        ? m === "off"
                          ? "border-stone bg-stone text-paper"
                          : "border-carbon bg-carbon text-paper"
                        : "border-carbon/15 text-stone hover:text-carbon",
                    )}
                  >
                    {m === "shop" ? t.admin.followsShop : m === "own" ? t.admin.ownHours : t.admin.dayOff}
                  </button>
                ))}
              </div>
              {d.mode === "own" ? (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    className="field !w-auto !py-1.5 !text-[12px]"
                    value={d.start_time}
                    onChange={(e) => patch(d.weekday, { start_time: e.target.value })}
                  />
                  <span className="text-stone">-</span>
                  <input
                    type="time"
                    className="field !w-auto !py-1.5 !text-[12px]"
                    value={d.end_time}
                    onChange={(e) => patch(d.weekday, { end_time: e.target.value })}
                  />
                </div>
              ) : (
                <span className="font-body text-[12px] text-stone">
                  {shopClosed(d.weekday)
                    ? t.hours.closed
                    : d.mode === "off"
                      ? t.admin.dayOff
                      : `${openingHours.find((h) => h.weekday === d.weekday)?.open_time} - ${openingHours.find((h) => h.weekday === d.weekday)?.close_time}`}
                </span>
              )}
            </div>
          ))}
        </div>
        <button onClick={saveHours} className="btn-solid mt-3 !px-5 !py-2.5">
          {saved ? t.admin.saved : t.common.save}
        </button>
      </div>

      <div>
        <h4 className="font-body text-[10px] font-semibold uppercase tracking-brand text-brass">
          {t.admin.absences}
        </h4>
        <p className="mt-1 font-body text-[12px] text-stone">{t.admin.absenceHint}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Field label={t.admin.from}>
            <input type="date" className="field !py-2" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label={t.admin.to}>
            <input type="date" className="field !py-2" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
          </Field>
          <Field label={t.admin.reason} className="sm:col-span-2">
            <div className="flex gap-2">
              <input
                className="field !py-2"
                value={reason}
                placeholder="Urlaub"
                onChange={(e) => setReason(e.target.value)}
              />
              <button onClick={addAbsence} disabled={!from || !to || to < from} className="btn-ghost shrink-0 !px-4 !py-2">
                <Plus size={13} /> {t.common.add}
              </button>
            </div>
          </Field>
        </div>
        <ul className="mt-3 space-y-1.5">
          {absences.length === 0 ? (
            <li className="font-body text-[12px] text-stone/70">{t.admin.noAbsences}</li>
          ) : (
            absences
              .sort((a, b) => a.start_date.localeCompare(b.start_date))
              .map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2"
                >
                  <span className="font-body text-[13px] text-carbon">
                    {fromDateKey(a.start_date).toLocaleDateString(lang, { day: "2-digit", month: "short" })}
                    {" - "}
                    {fromDateKey(a.end_date).toLocaleDateString(lang, { day: "2-digit", month: "short", year: "numeric" })}
                    {a.reason ? <span className="ml-2 text-stone">{a.reason}</span> : null}
                  </span>
                  <button
                    onClick={async () => {
                      await db.deleteAbsence(a.id);
                      loadAbsences();
                      reload();
                    }}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-stone transition-colors hover:text-destructive"
                    aria-label={t.common.delete}
                  >
                    <Trash2 size={13} />
                  </button>
                </li>
              ))
          )}
        </ul>
      </div>
    </div>
  );
}
