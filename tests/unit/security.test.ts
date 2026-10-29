import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SECURITY_HEADERS, headersFile, withSecurityHeaders } from "../../src/lib/security.ts";

describe("SECURITY_HEADERS", () => {
  it("sets the required headers", () => {
    expect(SECURITY_HEADERS["X-Content-Type-Options"]).toBe("nosniff");
    expect(SECURITY_HEADERS["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(SECURITY_HEADERS["Cross-Origin-Opener-Policy"]).toBe("same-origin");
    expect(SECURITY_HEADERS["Strict-Transport-Security"]).toMatch(/max-age=\d{7,}/);
  });

  it("denies camera, microphone and geolocation", () => {
    const policy = SECURITY_HEADERS["Permissions-Policy"];
    for (const feature of ["camera", "microphone", "geolocation"]) expect(policy).toContain(`${feature}=()`);
  });

  it("does not preload HSTS until the site is stable", () => {
    expect(SECURITY_HEADERS["Strict-Transport-Security"]).not.toContain("preload");
  });
});

describe("withSecurityHeaders", () => {
  it("adds the headers and keeps the body, status and existing headers", async () => {
    const res = withSecurityHeaders(
      new Response("hello", { status: 201, headers: { "Content-Type": "text/plain", "X-Own": "1" } }),
    );
    expect(res.status).toBe(201);
    expect(await res.text()).toBe("hello");
    expect(res.headers.get("x-own")).toBe("1");
    expect(res.headers.get("content-type")).toBe("text/plain");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("permissions-policy")).toContain("camera=()");
  });

  it("does not overwrite a header the route already set deliberately", () => {
    const res = withSecurityHeaders(new Response(null, { headers: { "Referrer-Policy": "no-referrer" } }));
    expect(res.headers.get("referrer-policy")).toBe("no-referrer");
  });

  it("keeps a redirect a redirect", () => {
    const res = withSecurityHeaders(new Response(null, { status: 302, headers: { Location: "https://x.example/" } }));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://x.example/");
  });
});

describe("public/_headers", () => {
  it("matches what the code says, so static pages and Worker responses cannot drift apart", () => {
    const onDisk = readFileSync(join(import.meta.dirname, "..", "..", "public", "_headers"), "utf8");
    expect(onDisk).toBe(headersFile());
  });
});
