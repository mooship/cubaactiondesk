import { describe, expect, it } from "vitest";
import { json, MARKDOWN_TYPE, textResponse } from "../../src/lib/http.ts";

describe("textResponse", () => {
  it("sends the body with the given content type", async () => {
    const res = textResponse("# Title", MARKDOWN_TYPE);
    expect(res.headers.get("Content-Type")).toBe("text/markdown; charset=utf-8");
    expect(await res.text()).toBe("# Title");
  });
});

describe("json", () => {
  it("is never cached and defaults to 200", async () => {
    const res = json({ ok: true });
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(await res.json()).toEqual({ ok: true });
  });

  it("takes a status and extra headers", () => {
    const res = json({ error: "slow down" }, 429, { "Retry-After": "60" });
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("60");
  });
});
