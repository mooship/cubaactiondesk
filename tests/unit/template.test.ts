import { describe, expect, it } from "vitest";
import { extractPlaceholders, renderTemplate } from "../../src/lib/template.ts";

describe("renderTemplate", () => {
  it("replaces placeholders with the supplied values", () => {
    const out = renderTemplate("My name is {name} and I live in {town}.", {
      name: "Thandi",
      town: "Gqeberha",
    });
    expect(out).toBe("My name is Thandi and I live in Gqeberha.");
  });

  it("leaves unfilled placeholders visible so the sender notices them", () => {
    const out = renderTemplate("Dear {mp_name}, I am {name}.", { name: "Thandi" });
    expect(out).toBe("Dear {mp_name}, I am Thandi.");
  });

  it("treats empty and whitespace-only values as unfilled", () => {
    const out = renderTemplate("{name} from {town}", { name: " ".repeat(3), town: "" });
    expect(out).toBe("{name} from {town}");
  });

  it("trims the supplied values", () => {
    expect(renderTemplate("Hi {name}", { name: "  Sipho  " })).toBe("Hi Sipho");
  });

  it("replaces every occurrence of a placeholder", () => {
    expect(renderTemplate("{name} / {name}", { name: "A" })).toBe("A / A");
  });

  it("does not substitute inside a substituted value", () => {
    expect(renderTemplate("{name} in {town}", { name: "{town}", town: "Durban" })).toBe("{town} in Durban");
  });

  it("is safe with replacement-pattern characters in values", () => {
    expect(renderTemplate("Hi {name}", { name: "$& $1 $$" })).toBe("Hi $& $1 $$");
  });

  it("ignores braces that are not placeholders", () => {
    expect(renderTemplate("{ } {Not Valid} {x-y}", {})).toBe("{ } {Not Valid} {x-y}");
  });
});

describe("extractPlaceholders", () => {
  it("returns unique keys in order of first appearance", () => {
    expect(extractPlaceholders("{b} {a} {b} {c}")).toEqual(["b", "a", "c"]);
  });

  it("returns an empty list when there are none", () => {
    expect(extractPlaceholders("plain text")).toEqual([]);
  });
});
