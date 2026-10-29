import { describe, expect, it } from "vitest";
import { MAILTO_MAX_LENGTH, buildMailto } from "../../src/lib/mailto.ts";

describe("buildMailto", () => {
  it("builds a mailto URL with encoded subject and body", () => {
    const { url } = buildMailto({
      to: ["a@example.org"],
      subject: "Hello there",
      body: "Line one\nLine two",
    });
    expect(url).toBe("mailto:a@example.org?subject=Hello%20there&body=Line%20one%0D%0ALine%20two");
  });

  it("uses CRLF line breaks as RFC 6068 requires", () => {
    const { url } = buildMailto({ to: [], subject: "s", body: "a\r\nb\nc" });
    expect(url).toContain("body=a%0D%0Ab%0D%0Ac");
  });

  it("encodes characters that would break the query string", () => {
    const { url } = buildMailto({ to: [], subject: "a&b=c?d#e", body: "50% & more" });
    expect(url).toContain("subject=a%26b%3Dc%3Fd%23e");
    expect(url).toContain("body=50%25%20%26%20more");
  });

  it("encodes non-ASCII text as UTF-8", () => {
    const { url } = buildMailto({ to: [], subject: "Cuba no está sola", body: "" });
    expect(url).toContain("Cuba%20no%20est%C3%A1%20sola");
  });

  it("joins several recipients with commas", () => {
    const { url } = buildMailto({ to: ["a@x.org", "b@y.org"], subject: "s", body: "b" });
    expect(url?.startsWith("mailto:a@x.org,b@y.org?")).toBe(true);
  });

  it("works without a recipient, for targets whose address the sender supplies", () => {
    const { url } = buildMailto({ to: [], subject: "s", body: "b" });
    expect(url?.startsWith("mailto:?subject=")).toBe(true);
  });

  it("keeps a URL of exactly the limit", () => {
    const base = buildMailto({ to: [], subject: "s", body: "" }).length;
    const fill = "a".repeat(MAILTO_MAX_LENGTH - base);
    const result = buildMailto({ to: [], subject: "s", body: fill });
    expect(result.length).toBe(MAILTO_MAX_LENGTH);
    expect(result.tooLong).toBe(false);
    expect(result.url).not.toBeNull();
  });

  it("withholds the URL one character over the limit so the UI offers Copy", () => {
    const base = buildMailto({ to: [], subject: "s", body: "" }).length;
    const fill = "a".repeat(MAILTO_MAX_LENGTH - base + 1);
    const result = buildMailto({ to: [], subject: "s", body: fill });
    expect(result.length).toBe(MAILTO_MAX_LENGTH + 1);
    expect(result.tooLong).toBe(true);
    expect(result.url).toBeNull();
  });

  it("measures the encoded length, where multi-byte characters grow", () => {
    const body = "é".repeat(500); // 6 encoded characters each
    const result = buildMailto({ to: [], subject: "s", body });
    expect(result.length).toBeGreaterThan(3000);
    expect(result.tooLong).toBe(true);
  });

  it("allows the limit to be overridden", () => {
    const result = buildMailto({ to: [], subject: "s", body: "hello", maxLength: 10 });
    expect(result.tooLong).toBe(true);
  });
});
