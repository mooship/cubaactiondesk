import { afterEach, describe, expect, it, vi } from "vitest";
import { getStorage } from "../../src/lib/done-store.ts";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getStorage", () => {
  it("returns localStorage when the browser allows it", () => {
    const storage = { getItem: () => null } as unknown as Storage;
    vi.stubGlobal("localStorage", storage);
    expect(getStorage()).toBe(storage);
  });

  it("returns null when touching localStorage throws, as it does with blocked site data", () => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() {
        throw new DOMException("The operation is insecure.", "SecurityError");
      },
    });
    try {
      expect(getStorage()).toBeNull();
    } finally {
      Reflect.deleteProperty(globalThis, "localStorage");
    }
  });
});
