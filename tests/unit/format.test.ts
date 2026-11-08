import { describe, expect, it } from "vitest";
import { formatDate, hostOf, isoDate, minutes, peopleCount } from "../../src/lib/format.ts";

describe("format", () => {
  it("writes absolute dates in plain English, in UTC", () => {
    expect(formatDate(new Date("2026-10-29T23:30:00Z"))).toBe("29 October 2026");
    expect(formatDate(new Date("2026-01-05"))).toBe("5 January 2026");
  });

  it("writes ISO dates", () => {
    expect(isoDate(new Date("2026-10-29T23:30:00Z"))).toBe("2026-10-29");
  });

  it("shows the bare domain of a URL", () => {
    expect(hostOf("https://www.example.org/donate?x=1")).toBe("example.org");
    expect(hostOf("https://give.example.org/")).toBe("give.example.org");
  });

  it("counts people", () => {
    expect(peopleCount(1)).toBe("1 person");
    expect(peopleCount(3)).toBe("3 people");
  });
});

describe("minutes", () => {
  it("uses the singular for one minute only", () => {
    expect(minutes(1)).toBe("1 minute");
    expect(minutes(2)).toBe("2 minutes");
  });
});
