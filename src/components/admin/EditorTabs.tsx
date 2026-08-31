import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Barber, BlockedSlot, OpeningHour, Service, Settings } from "@/data/types";
import { db } from "@/lib/db";
import { cn, toDateKey, uid } from "@/lib/utils";
import { Empty, Field } from "./shared";

/* ------------------------------ Leistungen ------------------------------ */

export function ServicesTab({ services, reload }: { services: Service[]; reload: () => void }) {
  const { t } = useLanguage();
  const [draft, setDraft] = useState<Service[]>(services);

  const patch = (id: string, p: Partial<Service>) =>
    setDraft((d) => d.map((s) => (s.id === id ? { ...s, ...p } : s)));

  const save = async (s: Service) => {
    await db.saveService(s);
    reload();
  };

  const remove = async (id: string) => {
    if (!window.confirm(t.admin.confirmDelete)) return;
    await db.deleteService(id);
    setDraft((d) => d.filter((s) => s.id !== id));
    reload();
  };

  const add = () => {
    const s: Service = {
      id: uid("svc"),
      slug: "neu",
      name_de: "Neue Leistung",
      name_en: "New service",
      name_tr: "Yeni hizmet",
      duration_min: 30,
      price: 20,
      is_from_price: false,
      category: "hair",
      sort_order: draft.length + 1,
      active: true,
    };
    setDraft((d) => [...d, s]);
  };

  return (
    <div className="space-y-3">
      <button onClick={add} className="btn-ghost !px-5 !py-2.5">
        <Plus size={13} /> {t.admin.newService}
      </button>

      {draft.map((s) => (
        <div key={s.id} className="border border-white/10 bg-ink p-4">
          <div className="grid gap-3 md:grid-cols-6">
            <Field label="DE" className="md:col-span-2">
              <input
                className="field !py-2"
                value={s.name_de}
                onChange={(e) => patch(s.id, { name_de: e.target.value })}
              />
            </Field>
            <Field label="EN" className="md:col-span-2">
              <input
                className="field !py-2"
                value={s.name_en}
                onChange={(e) => patch(s.id, { name_en: e.target.value })}
              />
            </Field>
            <Field label="TR" className="md:col-span-2">
              <input
                className="field !py-2"
                value={s.name_tr}
                onChange={(e) => patch(s.id, { name_tr: e.target.value })}
              />
            </Field>
            <Field label={t.admin.durationMin}>
              <input
                type="number"
                className="field !py-2"
                value={s.duration_min}
                onChange={(e) => patch(s.id, { duration_min: Number(e.target.value) })}
              />
            </Field>
            <Field label={t.admin.priceEur}>
              <input
                type="number"
                className="field !py-2"
                value={s.price}
                onChange={(e) => patch(s.id, { price: Number(e.target.value) })}
              />
            </Field>
            <Field label={t.services.eyebrow}>
              <select
                className="field !py-2"
                value={s.category}
                onChange={(e) => patch(s.id, { category: e.target.value as Service["category"] })}
              >
                {(["hair", "beard", "shave", "extra"] as const).map((c) => (
                  <option key={c} value={c}>
                    {t.services.groups[c]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t.admin.sortOrder}>
              <input
                type="number"
                className="field !py-2"
                value={s.sort_order}
                onChange={(e) => patch(s.id, { sort_order: Number(e.target.value) })}
              />
            </Field>
            <div className="flex items-end gap-2 md:col-span-2">
              <button
                onClick={() => patch(s.id, { active: !s.active })}
                className={cn(
                  "border px-3 py-2 font-body text-[10px] uppercase tracking-widest",
                  s.active ? "border-success/50 text-success" : "border-white/15 text-smoke",
                )}
              >
                {s.active ? t.admin.active : t.admin.inactive}
              </button>
              <button onClick={() => save(s)} className="btn-brass !px-5 !py-2.5">
                {t.common.save}
              </button>
              <button
                onClick={() => remove(s.id)}
                className="grid h-10 w-10 place-items-center border border-white/10 text-smoke hover:border-destructive hover:text-destructive"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------- Barbiere ------------------------------- */

export function BarbersTab({ barbers, reload }: { barbers: Barber[]; reload: () => void }) {
  const { t } = useLanguage();
  const [draft, setDraft] = useState<Barber[]>(barbers);

  const patch = (id: string, p: Partial<Barber>) =>
    setDraft((d) => d.map((b) => (b.id === id ? { ...b, ...p } : b)));

  const add = () =>
    setDraft((d) => [
      ...d,
      {
        id: uid("brb"),
        name: "Neuer Barbier",
        initials: "N",
        role_de: "Barber",
        role_en: "Barber",
        role_tr: "Berber",
        image_url: null,
        sort_order: d.length + 1,
        active: true,
      },
    ]);

  return (
    <div className="space-y-3">
      <button onClick={add} className="btn-ghost !px-5 !py-2.5">
        <Plus size={13} /> {t.admin.newBarber}
      </button>

      {draft.map((b) => (
        <div key={b.id} className="border border-white/10 bg-ink p-4">
          <div className="grid gap-3 md:grid-cols-6">
            <Field label={t.booking.name} className="md:col-span-2">
              <input
                className="field !py-2"
                value={b.name}
                onChange={(e) =>
                  patch(b.id, { name: e.target.value, initials: e.target.value.slice(0, 1).toUpperCase() })
                }
              />
            </Field>
            <Field label="DE" className="md:col-span-2">
              <input
                className="field !py-2"
                value={b.role_de}
                onChange={(e) => patch(b.id, { role_de: e.target.value })}
              />
            </Field>
            <Field label="EN" className="md:col-span-2">
              <input
                className="field !py-2"
                value={b.role_en}
                onChange={(e) => patch(b.id, { role_en: e.target.value })}
              />
            </Field>
            <Field label="TR" className="md:col-span-2">
              <input
                className="field !py-2"
                value={b.role_tr}
                onChange={(e) => patch(b.id, { role_tr: e.target.value })}
              />
            </Field>
            <Field label="Foto URL" className="md:col-span-2">
              <input
                className="field !py-2"
                value={b.image_url ?? ""}
                placeholder="https://"
                onChange={(e) => patch(b.id, { image_url: e.target.value || null })}
              />
            </Field>
            <div className="flex items-end gap-2 md:col-span-2">
              <button
                onClick={() => patch(b.id, { active: !b.active })}
                className={cn(
                  "border px-3 py-2 font-body text-[10px] uppercase tracking-widest",
                  b.active ? "border-success/50 text-success" : "border-white/15 text-smoke",
                )}
              >
                {b.active ? t.admin.active : t.admin.inactive}
              </button>
              <button
                onClick={async () => {
                  await db.saveBarber(b);
                  reload();
                }}
                className="btn-brass !px-5 !py-2.5"
              >
                {t.common.save}
              </button>
              <button
                onClick={async () => {
                  if (!window.confirm(t.admin.confirmDelete)) return;
                  await db.deleteBarber(b.id);
                  setDraft((d) => d.filter((x) => x.id !== b.id));
                  reload();
                }}
                className="grid h-10 w-10 place-items-center border border-white/10 text-smoke hover:border-destructive hover:text-destructive"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------- Offnungszeiten ---------------------------- */

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function HoursTab({
  openingHours,
  settings,
  reload,
}: {
  openingHours: OpeningHour[];
  settings: Settings;
  reload: () => void;
}) {
  const { t } = useLanguage();
  const [draft, setDraft] = useState<OpeningHour[]>(openingHours);
  const [cfg, setCfg] = useState<Settings>(settings);

  const patch = (weekday: number, p: Partial<OpeningHour>) =>
    setDraft((d) => d.map((h) => (h.weekday === weekday ? { ...h, ...p } : h)));

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        {WEEK_ORDER.map((weekday) => {
          const h = draft.find((x) => x.weekday === weekday);
          if (!h) return null;
          return (
            <div
              key={weekday}
              className="grid items-end gap-3 border border-white/10 bg-ink p-4 md:grid-cols-5"
            >
              <span className="font-display text-lg text-bone">{t.hours.days[weekday]}</span>
              <button
                onClick={() => patch(weekday, { is_open: !h.is_open })}
                className={cn(
                  "border px-3 py-2 font-body text-[10px] uppercase tracking-widest",
                  h.is_open ? "border-success/50 text-success" : "border-white/15 text-smoke",
                )}
              >
                {h.is_open ? t.admin.open : t.hours.closed}
              </button>
              <Field label={t.admin.from}>
                <input
                  type="time"
                  className="field !py-2"
                  value={h.open_time}
                  onChange={(e) => patch(weekday, { open_time: e.target.value })}
                />
              </Field>
              <Field label={t.admin.to}>
                <input
                  type="time"
                  className="field !py-2"
                  value={h.close_time}
                  onChange={(e) => patch(weekday, { close_time: e.target.value })}
                />
              </Field>
              <button
                onClick={async () => {
                  await db.saveOpeningHour(h);
                  reload();
                }}
                className="btn-brass !px-5 !py-2.5"
              >
                {t.common.save}
              </button>
            </div>
          );
        })}
      </div>

      <div className="border border-white/10 bg-ink p-5">
        <h3 className="font-body text-[10px] uppercase tracking-brand text-brass">
          {t.admin.settings}
        </h3>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <Field label={t.admin.granularity}>
            <input
              type="number"
              className="field !py-2"
              value={cfg.slot_granularity_min}
              onChange={(e) => setCfg({ ...cfg, slot_granularity_min: Number(e.target.value) })}
            />
          </Field>
          <Field label={t.admin.leadTime}>
            <input
              type="number"
              className="field !py-2"
              value={cfg.min_lead_time_min}
              onChange={(e) => setCfg({ ...cfg, min_lead_time_min: Number(e.target.value) })}
            />
          </Field>
          <Field label={t.admin.buffer}>
            <input
              type="number"
              className="field !py-2"
              value={cfg.buffer_after_min}
              onChange={(e) => setCfg({ ...cfg, buffer_after_min: Number(e.target.value) })}
            />
          </Field>
          <Field label={t.admin.maxAdvance}>
            <input
              type="number"
              className="field !py-2"
              value={cfg.max_advance_days}
              onChange={(e) => setCfg({ ...cfg, max_advance_days: Number(e.target.value) })}
            />
          </Field>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={() => setCfg({ ...cfg, auto_confirm: !cfg.auto_confirm })}
            className={cn(
              "border px-3 py-2 font-body text-[10px] uppercase tracking-widest",
              cfg.auto_confirm ? "border-success/50 text-success" : "border-white/15 text-smoke",
            )}
          >
            {t.admin.autoConfirm}
          </button>
          <button
            onClick={async () => {
              await db.saveSettings(cfg);
              reload();
            }}
            className="btn-brass !px-5 !py-2.5"
          >
            {t.common.save}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Sperrzeiten ------------------------------ */

export function BlocksTab({
  barbers,
  blocked,
  reload,
}: {
  barbers: Barber[];
  blocked: BlockedSlot[];
  reload: () => void;
}) {
  const { t, lang } = useLanguage();
  const [date, setDate] = useState(toDateKey(new Date()));
  const [barberId, setBarberId] = useState<string>("");
  const [allDay, setAllDay] = useState(true);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("13:00");
  const [reason, setReason] = useState("");

  const create = async () => {
    await db.createBlocked({
      barber_id: barberId || null,
      date,
      start_time: allDay ? "00:00" : start,
      end_time: allDay ? "23:59" : end,
      all_day: allDay,
      reason,
    });
    setReason("");
    reload();
  };

  return (
    <div className="space-y-6">
      <div className="grid items-end gap-3 border border-white/10 bg-ink p-5 md:grid-cols-6">
        <Field label={t.booking.date}>
          <input
            type="date"
            className="field !py-2"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
        <Field label={t.booking.barber}>
          <select
            className="field !py-2"
            value={barberId}
            onChange={(e) => setBarberId(e.target.value)}
          >
            <option value="">{t.admin.allBarbers}</option>
            {barbers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>
        <button
          onClick={() => setAllDay((v) => !v)}
          className={cn(
            "border px-3 py-2.5 font-body text-[10px] uppercase tracking-widest",
            allDay ? "border-brass text-brass" : "border-white/15 text-smoke",
          )}
        >
          {t.admin.allDay}
        </button>
        {!allDay ? (
          <>
            <Field label={t.admin.from}>
              <input
                type="time"
                className="field !py-2"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </Field>
            <Field label={t.admin.to}>
              <input
                type="time"
                className="field !py-2"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </Field>
          </>
        ) : (
          <div className="hidden md:col-span-2 md:block" />
        )}
        <Field label={t.admin.reason} className="md:col-span-4">
          <input
            className="field !py-2"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Urlaub, Feiertag, Termin ausserhalb"
          />
        </Field>
        <button onClick={create} className="btn-brass !px-5 !py-2.5 md:col-span-2">
          <Plus size={13} /> {t.admin.newBlock}
        </button>
      </div>

      {blocked.length === 0 ? (
        <Empty text={t.admin.noBookings} />
      ) : (
        <ul className="space-y-2">
          {[...blocked]
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-3 border border-white/10 bg-ink px-4 py-3"
              >
                <span className="font-body text-[12px] text-bone">
                  {new Date(b.date).toLocaleDateString(lang, {
                    weekday: "short",
                    day: "2-digit",
                    month: "short",
                  })}
                  <span className="ml-3 text-smoke">
                    {b.all_day ? t.admin.allDay : `${b.start_time} - ${b.end_time}`}
                  </span>
                  <span className="ml-3 text-smoke/70">
                    {b.barber_id
                      ? barbers.find((x) => x.id === b.barber_id)?.name
                      : t.admin.allBarbers}
                  </span>
                  {b.reason ? <span className="ml-3 text-smoke/60">{b.reason}</span> : null}
                </span>
                <button
                  onClick={async () => {
                    await db.deleteBlocked(b.id);
                    reload();
                  }}
                  className="grid h-9 w-9 place-items-center border border-white/10 text-smoke hover:border-destructive hover:text-destructive"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
