import { beforeEach, describe, expect, it } from "vitest";
import { db, resetDemoData } from "./db";
import { addDays, toDateKey } from "./utils";

/**
 * Le mode demo reproduit les regles de l'Edge Function create-booking.
 * Ces tests verrouillent les comportements que le client verra en demonstration.
 */

/**
 * Un jeudi a au moins 7 jours : loin du delai minimum, pas un dimanche, et
 * ni le mardi de Del ni le mercredi de Mustafa (jours de repos du seed).
 */
function futureThursday(): string {
  let d = addDays(new Date(), 7);
  while (d.getDay() !== 4) d = addDays(d, 1);
  return toDateKey(d);
}

const DATE = futureThursday();

const client = {
  client_name: "Test Kunde",
  client_email: "test@example.at",
  client_phone: "+43 660 1234567",
  notes: "",
  language: "de" as const,
};

beforeEach(() => {
  resetDemoData();
  localStorage.removeItem("delherren_booking_draft");
});

describe("createBooking (demo)", () => {
  it("recalcule duree et prix a partir des prestations", async () => {
    const b = await db.createBooking({
      ...client,
      barber_id: "brb-del",
      service_ids: ["svc-cut-style", "svc-beardshave"], // 30 + 15 min, 18 + 10 EUR
      booking_date: DATE,
      start_time: "10:00",
    });
    expect(b.duration_min).toBe(45);
    expect(b.end_time).toBe("10:45");
    expect(b.price).toBe(28);
    expect(b.discount).toBe(0);
    expect(b.manage_token.length).toBeGreaterThan(16);
    expect(b.status).toBe("confirmed");
    expect(b.source).toBe("online");
  });

  it("refuse un creneau deja pris chez le meme barbier", async () => {
    await db.createBooking({ ...client, barber_id: "brb-del", service_ids: ["svc-cut-style"], booking_date: DATE, start_time: "10:00" });
    await expect(
      db.createBooking({ ...client, barber_id: "brb-del", service_ids: ["svc-cut-style"], booking_date: DATE, start_time: "10:15" }),
    ).rejects.toThrow("SLOT_TAKEN");
  });

  it("accepte le meme creneau chez un autre barbier", async () => {
    await db.createBooking({ ...client, barber_id: "brb-del", service_ids: ["svc-cut-style"], booking_date: DATE, start_time: "10:00" });
    const b = await db.createBooking({ ...client, barber_id: "brb-mustafa", service_ids: ["svc-cut-style"], booking_date: DATE, start_time: "10:00" });
    expect(b.barber_id).toBe("brb-mustafa");
  });

  it("'egal wer' est resolu en un barbier concret et libre", async () => {
    await db.createBooking({ ...client, barber_id: "brb-del", service_ids: ["svc-cut-style"], booking_date: DATE, start_time: "10:00" });
    const b = await db.createBooking({ ...client, barber_id: null, service_ids: ["svc-cut-style"], booking_date: DATE, start_time: "10:00" });
    expect(b.barber_id).toBe("brb-mustafa");
  });

  it("refuse un creneau hors des horaires propres du barbier", async () => {
    await db.saveBarberHours("brb-del", [
      { barber_id: "brb-del", weekday: 4, active: true, start_time: "13:00", end_time: "18:00" },
    ]);
    await expect(
      db.createBooking({ ...client, barber_id: "brb-del", service_ids: ["svc-cut-style"], booking_date: DATE, start_time: "10:00" }),
    ).rejects.toThrow("OUTSIDE_HOURS");
    const ok = await db.createBooking({ ...client, barber_id: "brb-del", service_ids: ["svc-cut-style"], booking_date: DATE, start_time: "13:00" });
    expect(ok.start_time).toBe("13:00");
  });

  it("refuse un barbier absent ce jour-la", async () => {
    await db.createAbsence({ barber_id: "brb-del", start_date: DATE, end_date: DATE, reason: "Urlaub" });
    await expect(
      db.createBooking({ ...client, barber_id: "brb-del", service_ids: ["svc-cut-style"], booking_date: DATE, start_time: "10:00" }),
    ).rejects.toThrow("OUTSIDE_HOURS");
  });
});

describe("codes promo (demo)", () => {
  it("applique un pourcentage et consomme une utilisation", async () => {
    const quote = await db.quotePromo("willkommen10", 28);
    expect(quote.discount).toBe(3);

    const b = await db.createBooking({
      ...client, barber_id: "brb-del", service_ids: ["svc-cut-style", "svc-beardshave"],
      booking_date: DATE, start_time: "10:00", promo_code: "WILLKOMMEN10",
    });
    expect(b.discount).toBe(3);
    expect(b.price).toBe(25);
    expect(b.promo_code).toBe("WILLKOMMEN10");

    const promos = await db.listPromoCodes();
    expect(promos.find((p) => p.code === "WILLKOMMEN10")?.current_uses).toBe(1);
  });

  it("refuse un code sous le minimum, puis l'accepte avec un panier suffisant", async () => {
    await expect(db.quotePromo("DEL5", 18)).rejects.toThrow("MIN_ORDER");
    const q = await db.quotePromo("DEL5", 33);
    expect(q.discount).toBe(5);
  });

  it("un code invalide fait echouer la reservation, rien n'est ecrit", async () => {
    await expect(
      db.createBooking({ ...client, barber_id: "brb-del", service_ids: ["svc-cut-style"], booking_date: DATE, start_time: "10:00", promo_code: "FAUX" }),
    ).rejects.toThrow("PROMO_NOT_FOUND");
    const rows = await db.listBookings(DATE, DATE);
    expect(rows).toHaveLength(0);
  });
});

describe("lien de gestion (demo)", () => {
  it("expose le rendez-vous sans donnees internes et permet l'annulation dans le delai", async () => {
    const b = await db.createBooking({ ...client, barber_id: "brb-del", service_ids: ["svc-cut-style"], booking_date: DATE, start_time: "10:00" });
    const view = await db.getManagedBooking(b.manage_token);
    expect(view?.client_name).toBe("Test Kunde");
    expect(view?.barber_name).toBe("Del");
    expect(view?.service_names_de).toEqual(["Schneiden, Föhnen, Stylen"]);
    expect(view?.cancel_deadline_hours).toBe(24);

    await db.cancelByToken(b.manage_token);
    expect((await db.getManagedBooking(b.manage_token))?.status).toBe("cancelled");
    await expect(db.cancelByToken(b.manage_token)).rejects.toThrow("ALREADY_CANCELLED");
  });

  it("refuse l'annulation trop tard", async () => {
    await db.saveSettings({ ...(await db.getSettings()), cancel_deadline_hours: 24 * 30 });
    const b = await db.createBooking({ ...client, barber_id: "brb-del", service_ids: ["svc-cut-style"], booking_date: DATE, start_time: "10:00" });
    await expect(db.cancelByToken(b.manage_token)).rejects.toThrow("TOO_LATE");
  });

  it("un jeton inconnu ne renvoie rien", async () => {
    expect(await db.getManagedBooking("nope")).toBeNull();
    await expect(db.cancelByToken("nope")).rejects.toThrow("NOT_FOUND");
  });
});

describe("cote salon (demo)", () => {
  it("createAdminBooking ignore le delai minimum mais pas les conflits", async () => {
    const today = toDateKey(new Date());
    const dayOpen = new Date().getDay() !== 0;
    if (!dayOpen) return; // dimanche : le salon est ferme, rien a tester ici

    await db.createBooking({ ...client, barber_id: "brb-del", service_ids: ["svc-cut-style"], booking_date: DATE, start_time: "11:00" });
    await expect(
      db.createAdminBooking({
        barber_id: "brb-del", service_ids: ["svc-cut-style"], booking_date: DATE, start_time: "11:15",
        client_name: "Walk-in", client_phone: "", client_email: "", notes: "", status: "confirmed",
      }),
    ).rejects.toThrow("SLOT_TAKEN");

    const b = await db.createAdminBooking({
      barber_id: "brb-mustafa", service_ids: ["svc-machine"], booking_date: today, start_time: "09:00",
      client_name: "Walk-in", client_phone: "", client_email: "", notes: "", status: "done",
    });
    expect(b.source).toBe("admin");
    expect(b.status).toBe("done");
  });

  it("rescheduleBooking ne se bloque pas lui-meme et detecte les vrais conflits", async () => {
    const a = await db.createBooking({ ...client, barber_id: "brb-del", service_ids: ["svc-cut-style"], booking_date: DATE, start_time: "10:00" });
    await db.createBooking({ ...client, barber_id: "brb-del", service_ids: ["svc-cut-style"], booking_date: DATE, start_time: "12:00" });

    // Decaler de 15 min sur soi-meme : autorise
    await db.rescheduleBooking(a.id, { barber_id: "brb-del", booking_date: DATE, start_time: "10:15", duration_min: 30 });
    const moved = (await db.listBookings(DATE, DATE)).find((b) => b.id === a.id)!;
    expect(moved.start_time).toBe("10:15");
    expect(moved.end_time).toBe("10:45");

    // Sur l'autre rendez-vous : refuse
    await expect(
      db.rescheduleBooking(a.id, { barber_id: "brb-del", booking_date: DATE, start_time: "12:15", duration_min: 30 }),
    ).rejects.toThrow("SLOT_TAKEN");
  });

  it("cancelBooking horodate l'annulation", async () => {
    const a = await db.createBooking({ ...client, barber_id: "brb-del", service_ids: ["svc-cut-style"], booking_date: DATE, start_time: "10:00" });
    await db.cancelBooking(a.id);
    const row = (await db.listBookings(DATE, DATE)).find((b) => b.id === a.id)!;
    expect(row.status).toBe("cancelled");
    expect(row.cancelled_at).not.toBeNull();
    // Le creneau redevient libre
    const busy = await db.listBusy(DATE, DATE);
    expect(busy.some((b) => b.start_time === "10:00")).toBe(false);
  });
});

describe("deuxieme personne et cloture (demo)", () => {
  it("cree deux rendez-vous enchaines chez le meme barbier, ou aucun", async () => {
    const b = await db.createBooking({
      ...client, barber_id: "brb-del", service_ids: ["svc-cut-style"], booking_date: DATE, start_time: "10:00",
      second: { client_name: "Sohn", service_ids: ["svc-kids"] }, // 25 min
    });
    const rows = (await db.listBookings(DATE, DATE)).filter((x) => x.barber_id === "brb-del");
    expect(rows).toHaveLength(2);
    const son = rows.find((x) => x.client_name === "Sohn")!;
    expect(son.start_time).toBe(b.end_time);
    expect(son.end_time).toBe("10:55");
    expect(son.client_phone).toBe(client.client_phone);

    // Si le second ne tient pas (autre rendez-vous a 10:45), rien n'est ecrit.
    await db.createBooking({ ...client, barber_id: "brb-mustafa", service_ids: ["svc-cut-style"], booking_date: DATE, start_time: "10:45" });
    await expect(
      db.createBooking({
        ...client, barber_id: "brb-mustafa", service_ids: ["svc-cut-style"], booking_date: DATE, start_time: "10:00",
        second: { client_name: "Sohn", service_ids: ["svc-kids"] },
      }),
    ).rejects.toThrow("SLOT_TAKEN");
    const mehmet = (await db.listBookings(DATE, DATE)).filter((x) => x.barber_id === "brb-mustafa");
    expect(mehmet).toHaveLength(1);
  });

  it("closePastBookings passe les rendez-vous passes en done, pas les futurs", async () => {
    const yesterday = toDateKey(addDays(new Date(), -1));
    await db.updateBooking("bkg-demo-0", { booking_date: yesterday, status: "confirmed" });
    const n = await db.closePastBookings();
    expect(n).toBeGreaterThanOrEqual(1);
    const rows = await db.listBookings(yesterday, DATE);
    expect(rows.find((b) => b.id === "bkg-demo-0")?.status).toBe("done");
    expect(rows.filter((b) => b.booking_date === DATE).every((b) => b.status !== "done")).toBe(true);
  });

  it("notes clients : ecrire, relire, effacer", async () => {
    await db.saveClientNote("436601234567", "Test", "Fade 3 mm");
    expect((await db.listClientNotes())["436601234567"]).toBe("Fade 3 mm");
    await db.saveClientNote("436601234567", "Test", "");
    expect((await db.listClientNotes())["436601234567"]).toBeUndefined();
  });
});
