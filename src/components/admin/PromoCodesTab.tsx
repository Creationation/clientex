import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { PromoCode } from "@/data/types";
import { db } from "@/lib/db";
import { uid } from "@/lib/utils";
import { Empty, Field, Toggle } from "./shared";

export function PromoCodesTab() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<PromoCode[]>([]);
  const [savedId, setSavedId] = useState<string | null>(null);

  const load = () => db.listPromoCodes().then(setRows).catch(() => undefined);
  useEffect(() => {
    void load();
  }, []);

  const patch = (id: string, p: Partial<PromoCode>) =>
    setRows((d) => d.map((r) => (r.id === id ? { ...r, ...p } : r)));

  const add = () =>
    setRows((d) => [
      {
        id: uid("prm"),
        code: "NEU10",
        description: "",
        discount_type: "percent",
        discount_value: 10,
        min_order: 0,
        max_uses: null,
        current_uses: 0,
        active: true,
        expires_at: null,
      },
      ...d,
    ]);

  const save = async (p: PromoCode) => {
    await db.savePromoCode(p);
    setSavedId(p.id);
    window.setTimeout(() => setSavedId(null), 1500);
    void load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl font-body text-[13px] text-stone">{t.admin.promo.hint}</p>
        <button onClick={add} className="btn-ghost !px-5 !py-2.5">
          <Plus size={14} /> {t.admin.promo.newPromo}
        </button>
      </div>

      {rows.length === 0 ? <Empty text={t.admin.stats.noData} /> : null}

      {rows.map((p) => (
        <div key={p.id} className="rounded-2xl border border-carbon/10 bg-paper-soft p-4">
          <div className="grid gap-3 md:grid-cols-6">
            <Field label={t.admin.promo.code}>
              <input
                className="field !py-2.5 uppercase tracking-wider"
                value={p.code}
                onChange={(e) => patch(p.id, { code: e.target.value.toUpperCase() })}
              />
            </Field>
            <Field label={t.admin.promo.description} className="md:col-span-2">
              <input
                className="field !py-2.5"
                value={p.description}
                onChange={(e) => patch(p.id, { description: e.target.value })}
              />
            </Field>
            <Field label={t.admin.promo.type}>
              <select
                className="field !py-2.5"
                value={p.discount_type}
                onChange={(e) => patch(p.id, { discount_type: e.target.value as PromoCode["discount_type"] })}
              >
                <option value="percent">{t.admin.promo.percent}</option>
                <option value="fixed">{t.admin.promo.fixed}</option>
              </select>
            </Field>
            <Field label={t.admin.promo.value}>
              <input
                type="number"
                min={0}
                className="field !py-2.5"
                value={p.discount_value}
                onChange={(e) => patch(p.id, { discount_value: Number(e.target.value) })}
              />
            </Field>
            <Field label={t.admin.promo.minOrder}>
              <input
                type="number"
                min={0}
                className="field !py-2.5"
                value={p.min_order}
                onChange={(e) => patch(p.id, { min_order: Number(e.target.value) })}
              />
            </Field>
            <Field label={`${t.admin.promo.maxUses} (${t.admin.promo.unlimited}: 0)`}>
              <input
                type="number"
                min={0}
                className="field !py-2.5"
                value={p.max_uses ?? 0}
                onChange={(e) => patch(p.id, { max_uses: Number(e.target.value) > 0 ? Number(e.target.value) : null })}
              />
            </Field>
            <Field label={t.admin.promo.expires}>
              <input
                type="date"
                className="field !py-2.5"
                value={p.expires_at ?? ""}
                onChange={(e) => patch(p.id, { expires_at: e.target.value || null })}
              />
            </Field>
            <Field label={t.admin.promo.uses}>
              <p className="field !py-2.5 text-stone">
                {p.current_uses}
                {p.max_uses ? ` / ${p.max_uses}` : ""}
              </p>
            </Field>
            <div className="flex items-end gap-2 md:col-span-3">
              <Toggle
                on={p.active}
                onClick={() => patch(p.id, { active: !p.active })}
                labelOn={t.admin.active}
                labelOff={t.admin.inactive}
              />
              <button onClick={() => save(p)} className="btn-solid !px-5 !py-2.5">
                {savedId === p.id ? t.admin.saved : t.common.save}
              </button>
              <button
                onClick={async () => {
                  if (!window.confirm(t.admin.confirmDelete)) return;
                  await db.deletePromoCode(p.id);
                  void load();
                }}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-carbon/12 text-stone transition-colors hover:border-destructive/50 hover:text-destructive"
                aria-label={t.common.delete}
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
