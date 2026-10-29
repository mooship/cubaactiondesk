import { describe, expect, it } from "vitest";
import { buildWhatsAppShare } from "../../src/lib/whatsapp.ts";

describe("buildWhatsAppShare", () => {
  it("builds a wa.me share link with the text encoded", () => {
    expect(buildWhatsAppShare("Hello world")).toBe("https://wa.me/?text=Hello%20world");
  });

  it("encodes newlines, ampersands and question marks", () => {
    expect(buildWhatsAppShare("a&b\nc?d")).toBe("https://wa.me/?text=a%26b%0Ac%3Fd");
  });

  it("encodes emoji and accented text as UTF-8", () => {
    expect(buildWhatsAppShare("Cuba no está sola ⭐")).toBe(
      "https://wa.me/?text=Cuba%20no%20est%C3%A1%20sola%20%E2%AD%90",
    );
  });

  it("round-trips through decoding", () => {
    const text = "Line 1\nLine 2 & 100% sure? #cuba";
    const url = new URL(buildWhatsAppShare(text));
    expect(url.searchParams.get("text")).toBe(text);
  });
});
