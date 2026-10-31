import { describe, expect, it } from "bun:test";
import { youthAdvice } from "./youth-advice";

const p = (age, overall, pot) => ({
  age,
  overall,
  potential_min: pot,
  potential_max: pot,
});

describe("youthAdvice", () => {
  it("promotes OVR 70+", () => expect(youthAdvice(p(17, 70, 72)).action).toBe("promote"));
  it("promotes OVR 65+ with POT 80+", () =>
    expect(youthAdvice(p(17, 65, 80)).action).toBe("promote"));
  it("keeps POT 80+ not ready", () => expect(youthAdvice(p(16, 60, 85)).action).toBe("keep"));
  it("loans 17+ with OVR <62 and POT 75+", () =>
    expect(youthAdvice(p(17, 61, 76)).action).toBe("loan"));
  it("releases POT under 70", () => expect(youthAdvice(p(16, 55, 69)).action).toBe("release"));
  it("releases 18+ with OVR <58 and POT <75", () =>
    expect(youthAdvice(p(18, 57, 74)).action).toBe("release"));
  it("watches the rest", () => expect(youthAdvice(p(16, 60, 74)).action).toBe("watch"));
});
