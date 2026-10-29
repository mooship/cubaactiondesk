import { describe, expect, it } from "vitest";
import { isDonateEnabled, nextCheckState, statusFromRow } from "../../src/lib/linkstate.ts";

describe("nextCheckState", () => {
  it("resets the failure streak on success", () => {
    expect(nextCheckState(1, 200)).toEqual({ lastStatus: 200, consecutiveFail: 0 });
  });

  it("counts one failure", () => {
    expect(nextCheckState(0, 500)).toEqual({ lastStatus: 500, consecutiveFail: 1 });
  });

  it("counts a second consecutive failure", () => {
    expect(nextCheckState(1, 404)).toEqual({ lastStatus: 404, consecutiveFail: 2 });
  });

  it("treats a network error (no status) as a failure", () => {
    expect(nextCheckState(0, null)).toEqual({ lastStatus: null, consecutiveFail: 1 });
  });

  it.each([200, 204, 301, 302, 399])("%i is a success", (status) => {
    expect(nextCheckState(2, status).consecutiveFail).toBe(0);
  });

  it.each([400, 403, 404, 500, 503])("%i is a failure", (status) => {
    expect(nextCheckState(0, status).consecutiveFail).toBe(1);
  });
});

describe("statusFromRow", () => {
  it("is unchecked before any check has run", () => {
    expect(statusFromRow(undefined)).toBe("unchecked");
  });

  it("is verified after a pass", () => {
    expect(statusFromRow({ consecutiveFail: 0 })).toBe("verified");
  });

  it("warns after one failure but is not yet under review", () => {
    expect(statusFromRow({ consecutiveFail: 1 })).toBe("warning");
  });

  it("goes under review after two consecutive failures", () => {
    expect(statusFromRow({ consecutiveFail: 2 })).toBe("review");
    expect(statusFromRow({ consecutiveFail: 5 })).toBe("review");
  });
});

describe("isDonateEnabled", () => {
  it("disables the donate button only while under review", () => {
    expect(isDonateEnabled("review")).toBe(false);
    expect(isDonateEnabled("warning")).toBe(true);
    expect(isDonateEnabled("verified")).toBe(true);
    expect(isDonateEnabled("unchecked")).toBe(true);
  });
});
