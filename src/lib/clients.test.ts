import { describe, expect, it } from "vitest";
import { buildClientProfiles, matchesQuery, phoneKey } from "./clients";
import type { Booking } from "@/data/types";

const base: Booking = {
  id: "b", barber_id: "brb-del", service_ids: ["svc-cut-style"], booking_date: "2026-09-01",
  start_time: "10:00", end_time: "10:30", duration_min: 30, price: 18,
  status: "done", source: "online", client_name: "Lukas Berger", client_email: "lukas@example.at",
  client_phone: "+43 660 1234567", notes: "", language: "de", manage_token: "t", cancelled_at: null,
  reminder_sent_24h: false, reminder_sent_2h: false, followup_sent: false, created_at: "",
};

describe("phoneKey", () => {
  it("normalise les formats autrichiens courants vers la meme cle", () => {
    expect(phoneKey("+43 660 1234567")).toBe("436601234567");
    expect(phoneKey("0660 123 45 67")).toBe("436601234567");
    expect(phoneKey("0043-660-1234567")).toBe("436601234567");
    expect(phoneKey("+43 (0)660 1234567")).toBe("4306601234567"); // le (0) reste, format rare, accepte
  });
});

describe("buildClientProfiles", () => {
  const today = "2026-09-15";
  it("regroupe par telephone, compte les visites passees et le prochain rendez-vous", () => {
    const rows: Booking[] = [
      base,
      { ...base, id: "b2", booking_date: "2026-09-08", client_phone: "0660 1234567", service_ids: ["svc-machine"], status: "done" },
      { ...base, id: "b3", booking_date: "2026-09-20", status: "confirmed" },
      { ...base, id: "b4", booking_date: "2026-08-01", status: "no_show" },
      { ...base, id: "b5", booking_date: "2026-08-15", status: "cancelled" },
    ];
    const [c] = buildClientProfiles(rows, { "436601234567": "Fade 3 mm" }, today);
    expect(c.key).toBe("436601234567");
    expect(c.visits).toBe(2);
    expect(c.no_shows).toBe(1);
    expect(c.last_visit).toBe("2026-09-08");
    expect(c.last_service_ids).toEqual(["svc-machine"]);
    expect(c.next_visit).toBe("2026-09-20");
    expect(c.note).toBe("Fade 3 mm");
  });

  it("un nouveau client n'a aucune visite mais un prochain rendez-vous", () => {
    const [c] = buildClientProfiles([{ ...base, booking_date: "2026-09-20", status: "confirmed" }], {}, today);
    expect(c.visits).toBe(0);
    expect(c.next_visit).toBe("2026-09-20");
    expect(c.last_service_ids).toEqual(["svc-cut-style"]);
  });

  it("ignore les walk-ins sans telephone", () => {
    expect(buildClientProfiles([{ ...base, client_phone: "000000" }], {}, today)).toEqual([]);
  });

  it("le nom le plus recent fait foi", () => {
    const rows = [base, { ...base, id: "x", booking_date: "2026-09-10", client_name: "Lukas B." }];
    expect(buildClientProfiles(rows, {}, today)[0].name).toBe("Lukas B.");
  });
});

describe("matchesQuery", () => {
  const c = { name: "Lukas Berger", phone: "+43 660 1234567", email: "lukas@example.at" };
  it("nom, e-mail, et telephone sans se soucier des espaces", () => {
    expect(matchesQuery(c, "berg")).toBe(true);
    expect(matchesQuery(c, "EXAMPLE")).toBe(true);
    expect(matchesQuery(c, "660 123")).toBe(true);
    expect(matchesQuery(c, "0660123")).toBe(true); // 0660 est normalise en 43660, comme le numero
    expect(matchesQuery(c, "peter")).toBe(false);
    expect(matchesQuery(c, "")).toBe(true);
  });
});
