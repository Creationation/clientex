import { describe, expect, it } from "vitest";
import { canSelfCancel } from "./pricing";

describe("canSelfCancel", () => {
  const now = new Date(2026, 8, 15, 10, 0);
  it("possible a plus de 24 h", () => {
    expect(canSelfCancel("2026-09-16", "10:30", 24, now)).toBe(true);
  });
  it("impossible a moins de 24 h", () => {
    expect(canSelfCancel("2026-09-16", "09:30", 24, now)).toBe(false);
  });
  it("delai a zero : toujours possible avant le debut", () => {
    expect(canSelfCancel("2026-09-15", "10:15", 0, now)).toBe(true);
    expect(canSelfCancel("2026-09-15", "09:45", 0, now)).toBe(false);
  });
});
