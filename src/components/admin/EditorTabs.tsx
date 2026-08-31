import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type {
  AdminAccount, Barber, BlockedSlot, OpeningHour, Service, Settings,
} from "@/data/types";
import { db } from "@/lib/db";
import { cn, toDateKey, uid } from "@/lib/utils";
import { Empty, Field, Toggle } from "./shared";

const DeleteButton = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-carbon/12 text-stone transition-colors hover:border-destructive/50 hover:text-destructive"
  >
    <Trash2 size={15} />
  </button>
);

/* ------------------------------ Leistungen ------------------------------ */

export function ServicesTab({ services, reload }: { services: Service[]; reload: () => void }) {
  const { t } = useLanguage();
  const [draft, setDraft] = useState<Service[]>(services);

  useEffect(() => setDraft(services), [services]);

  const patch = (id: string, p: Partial<Service>) =>
    setDraft((d) => d.map((s) => (s.id === id ? { ...s, ...p } : s)));

  const add = () =>
    setDraft((d) => [
      ...d,
      {
        id: uid("svc"),
        slug: `neu-${d.length + 1}`,
        name_de: "Neue Leistung",
        name_en: "New service",
        duration_min: 30,
        price: 20,
        is_from_price: false,
        category: "hair",
        sort_order: d.length + 1,
        active: true,
      },
    ]);

  return (
    <div className="space-y-3">
      <button onClick={add} className="btn-ghost !px-5 !py-2.5">
        <Plus size={14} /> {t.admin.newService}
      </button>

      {draft.map((s) => (
        <div key={s.id} className="rounded-2xl border border-carbon/10 bg-paper-soft p-4">
          <div className="grid gap-3 md:grid-cols-6">
            <Field label="Deutsch" className="md:col-span-3">
              <input
                className="field !py-2.5"
                value={s.name_de}
                onChange={(e) => patch(s.id, { name_de: e.target.value })}
              />
            </Field>
            <Field label="English" className="md:col-span-3">
              <input
                className="field !py-2.5"
                value={s.name_en}
                onChange={(e) => patch(s.id, { name_en: e.target.value })}
              />
            </Field>
            <Field label={t.admin.durationMin}>
              <input
                type="number"
                className="field !py-2.5"
                value={s.duration_min}
                onChange={(e) => patch(s.id, { duration_min: Number(e.target.value) })}
              />
            </Field>
            <Field label={t.admin.priceEur}>
              <input
                type="number"
                className="field !py-2.5"
                value={s.price}
                onChange={(e) => patch(s.id, { price: Number(e.target.value) })}
              />
            </Field>
            <Field label={t.services.eyebrow}>
              <select
                className="field !py-2.5"
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
                className="field !py-2.5"
                value={s.sort_order}
                onChange={(e) => patch(s.id, { sort_order: Number(e.target.value) })}
              />
            </Field>
            <div className="flex items-end gap-2 md:col-span-2">
              <Toggle
                on={s.active}
                onClick={() => patch(s.id, { active: !s.active })}
                labelOn={t.admin.active}
                labelOff={t.admin.inactive}
              />
              <button
                onClick={async () => {
                  await db.saveService(s);
                  reload();
                }}
                className="btn-solid !px-5 !py-2.5"
              >
                {t.common.save}
              </button>
              <DeleteButton
                onClick={async () => {
                  if (!window.confirm(t.admin.confirmDelete)) return;
                  await db.deleteService(s.id);
                  reload();
                }}
              />
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

  useEffect(() => setDraft(barbers), [barbers]);

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
        image_url: null,
        sort_order: d.length + 1,
        active: true,
      },
    ]);

  return (
    <div className="space-y-3">
      <button onClick={add} className="btn-ghost !px-5 !py-2.5">
        <Plus size={14} /> {t.admin.newBarber}
      </button>

      {draft.map((b) => (
        <div key={b.id} className="rounded-2xl border border-carbon/10 bg-paper-soft p-4">
          <div className="grid gap-3 md:grid-cols-6">
            <Field label={t.booking.name} className="md:col-span-2">
              <input
                className="field !py-2.5"
                value={b.name}
                onChange={(e) =>
                  patch(b.id, {
                    name: e.target.value,
                    initials: e.target.value.slice(0, 1).toUpperCase(),
                  })
                }
              />
            </Field>
            <Field label="Deutsch" className="md:col-span-2">
              <input
                className="field !py-2.5"
                value={b.role_de}
                onChange={(e) => patch(b.id, { role_de: e.target.value })}
              />
            </Field>
            <Field label="English" className="md:col-span-2">
              <input
                className="field !py-2.5"
                value={b.role_en}
                onChange={(e) => patch(b.id, { role_en: e.target.value })}
              />
            </Field>
            <Field label="Foto URL" className="md:col-span-4">
              <input
                className="field !py-2.5"
                value={b.image_url ?? ""}
                placeholder="https://"
                onChange={(e) => patch(b.id, { image_url: e.target.value || null })}
              />
            </Field>
            <div className="flex items-end gap-2 md:col-span-2">
              <Toggle
                on={b.active}
                onClick={() => patch(b.id, { active: !b.active })}
                labelOn={t.admin.active}
                labelOff={t.admin.inactive}
              />
              <button
                onClick={async () => {
                  await db.saveBarber(b);
                  reload();
                }}
                className="btn-solid !px-5 !py-2.5"
              >
                {t.common.save}
              </button>
              <DeleteButton
                onClick={async () => {
                  if (!window.confirm(t.admin.confirmDelete)) return;
                  await db.deleteBarber(b.id);
                  reload();
                }}
              />
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

  useEffect(() => setDraft(openingHours), [openingHours]);
  useEffect(() => setCfg(settings), [settings]);

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
              className="grid items-end gap-3 rounded-2xl border border-carbon/10 bg-paper-soft p-4 md:grid-cols-5"
            >
              <span className="font-display text-[19px] font-medium text-carbon">
                {t.hours.days[weekday]}
              </span>
              <Toggle
                on={h.is_open}
                onClick={() => patch(weekday, { is_open: !h.is_open })}
                labelOn={t.admin.open}
                labelOff={t.hours.closed}
              />
              <Field label={t.admin.from}>
                <input
                  type="time"
                  className="field !py-2.5"
                  value={h.open_time}
                  onChange={(e) => patch(weekday, { open_time: e.target.value })}
                />
              </Field>
              <Field label={t.admin.to}>
                <input
                  type="time"
                  className="field !py-2.5"
                  value={h.close_time}
                  onChange={(e) => patch(weekday, { close_time: e.target.value })}
                />
              </Field>
              <button
                onClick={async () => {
                  await db.saveOpeningHour(h);
                  reload();
                }}
                className="btn-solid !px-5 !py-2.5"
              >
                {t.common.save}
              </button>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-carbon/10 bg-paper-soft p-5">
        <h3 className="font-body text-[10px] font-semibold uppercase tracking-brand text-brass">
          {t.admin.settings}
        </h3>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <Field label={t.admin.granularity}>
            <input
              type="number"
              className="field !py-2.5"
              value={cfg.slot_granularity_min}
              onChange={(e) => setCfg({ ...cfg, slot_granularity_min: Number(e.target.value) })}
            />
          </Field>
          <Field label={t.admin.leadTime}>
            <input
              type="number"
              className="field !py-2.5"
              value={cfg.min_lead_time_min}
              onChange={(e) => setCfg({ ...cfg, min_lead_time_min: Number(e.target.value) })}
            />
          </Field>
          <Field label={t.admin.buffer}>
            <input
              type="number"
              className="field !py-2.5"
              value={cfg.buffer_after_min}
              onChange={(e) => setCfg({ ...cfg, buffer_after_min: Number(e.target.value) })}
            />
          </Field>
          <Field label={t.admin.maxAdvance}>
            <input
              type="number"
              className="field !py-2.5"
              value={cfg.max_advance_days}
              onChange={(e) => setCfg({ ...cfg, max_advance_days: Number(e.target.value) })}
            />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Toggle
            on={cfg.auto_confirm}
            onClick={() => setCfg({ ...cfg, auto_confirm: !cfg.auto_confirm })}
            labelOn={t.admin.autoConfirm}
            labelOff={t.admin.autoConfirm}
          />
          <button
            onClick={async () => {
              await db.saveSettings(cfg);
              reload();
            }}
            className="btn-solid !px-5 !py-2.5"
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
      <div className="grid items-end gap-3 rounded-2xl border border-carbon/10 bg-paper-soft p-5 md:grid-cols-6">
        <Field label={t.booking.date}>
          <input
            type="date"
            className="field !py-2.5"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
        <Field label={t.booking.barber}>
          <select
            className="field !py-2.5"
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
        <div className="flex items-end">
          <button
            onClick={() => setAllDay((v) => !v)}
            className={cn(
              "rounded-full border px-4 py-2.5 font-body text-[11px] font-semibold uppercase tracking-widest transition-colors",
              allDay ? "border-carbon bg-carbon text-paper" : "border-carbon/15 bg-white text-stone",
            )}
          >
            {t.admin.allDay}
          </button>
        </div>
        {!allDay ? (
          <>
            <Field label={t.admin.from}>
              <input
                type="time"
                className="field !py-2.5"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </Field>
            <Field label={t.admin.to}>
              <input
                type="time"
                className="field !py-2.5"
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
            className="field !py-2.5"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Urlaub, Feiertag, Termin ausserhalb"
          />
        </Field>
        <button onClick={create} className="btn-solid !px-5 !py-2.5 md:col-span-2">
          <Plus size={14} /> {t.admin.newBlock}
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
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-carbon/10 bg-white px-5 py-3.5"
              >
                <span className="font-body text-[13px] text-carbon">
                  {new Date(b.date).toLocaleDateString(lang, {
                    weekday: "short",
                    day: "2-digit",
                    month: "short",
                  })}
                  <span className="ml-3 text-stone">
                    {b.all_day ? t.admin.allDay : `${b.start_time} - ${b.end_time}`}
                  </span>
                  <span className="ml-3 text-stone/80">
                    {b.barber_id
                      ? barbers.find((x) => x.id === b.barber_id)?.name
                      : t.admin.allBarbers}
                  </span>
                  {b.reason ? <span className="ml-3 text-stone/70">{b.reason}</span> : null}
                </span>
                <DeleteButton
                  onClick={async () => {
                    await db.deleteBlocked(b.id);
                    reload();
                  }}
                />
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

/* -------------------------------- Zugange -------------------------------- */

export function AdminsTab({
  admins,
  demo,
  reload,
}: {
  admins: AdminAccount[];
  demo: boolean;
  reload: () => void;
}) {
  const { t, lang } = useLanguage();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setError(null);
    try {
      await db.createAdmin({ email, name, password });
      setEmail("");
      setName("");
      setPassword("");
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid items-end gap-3 rounded-2xl border border-carbon/10 bg-paper-soft p-5 md:grid-cols-4">
        <Field label={t.admin.adminName}>
          <input className="field !py-2.5" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label={t.admin.adminEmail}>
          <input
            className="field !py-2.5"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        {demo ? (
          <Field label={t.admin.adminPassword}>
            <input
              className="field !py-2.5"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
        ) : (
          <div className="hidden md:block" />
        )}
        <button
          onClick={create}
          disabled={!email.trim() || !name.trim() || (demo && password.length < 6)}
          className="btn-solid !px-5 !py-2.5"
        >
          <Plus size={14} /> {t.admin.newAdmin}
        </button>
      </div>

      {!demo ? (
        <p className="rounded-2xl border border-brass/25 bg-brass/[0.06] px-5 py-3.5 font-body text-[13px] leading-relaxed text-carbon">
          {t.admin.adminHint}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-2xl border border-destructive/30 bg-destructive/[0.07] px-5 py-3.5 font-body text-[13px] text-destructive">
          {error}
        </p>
      ) : null}

      <ul className="space-y-2">
        {admins.map((a) => (
          <li
            key={a.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-carbon/10 bg-white px-5 py-4"
          >
            <span>
              <span className="block font-display text-[18px] font-medium text-carbon">
                {a.name || a.email}
              </span>
              <span className="block font-body text-[12px] text-stone">
                {a.email}
                {a.created_at
                  ? ` · ${new Date(a.created_at).toLocaleDateString(lang, {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}`
                  : ""}
              </span>
            </span>
            <DeleteButton
              onClick={async () => {
                if (!window.confirm(t.admin.confirmDelete)) return;
                await db.deleteAdmin(a.id);
                reload();
              }}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
