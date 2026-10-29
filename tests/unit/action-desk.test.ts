import { describe, expect, it } from "vitest";
import { computeSend, fillTemplate, parseValues } from "../../src/lib/action-desk.ts";
import { addDone, nextAction, readDone } from "../../src/lib/done-store.ts";
import { MAILTO_MAX_LENGTH } from "../../src/lib/mailto.ts";

describe("parseValues", () => {
  const params = (qs: string) => new URLSearchParams(qs);

  it("reads only the keys the action defines", () => {
    expect(parseValues(params("name=Thandi&town=Durban&evil=x"), ["name", "town"])).toEqual({
      name: "Thandi",
      town: "Durban",
    });
  });

  it("trims values and drops empty ones", () => {
    expect(parseValues(params("name=%20Thandi%20&town="), ["name", "town"])).toEqual({ name: "Thandi" });
  });

  it("caps very long values", () => {
    const out = parseValues(params(`name=${"a".repeat(5000)}`), ["name"]);
    expect(out.name).toHaveLength(1000);
  });

  it("uses the first value when a key repeats", () => {
    expect(parseValues(params("name=A&name=B"), ["name"])).toEqual({ name: "A" });
  });
});

describe("fillTemplate", () => {
  it("fills the reserved {link} placeholder from the site, plus the sender's values", () => {
    const out = fillTemplate("Hi, I am {name}. Read {link}", { name: "Sipho" }, "https://example.org/learn/x");
    expect(out).toBe("Hi, I am Sipho. Read https://example.org/learn/x");
  });

  it("leaves {link} visible when there is no link", () => {
    expect(fillTemplate("See {link}", {})).toBe("See {link}");
  });

  it("does not let a sender's value override the link", () => {
    expect(fillTemplate("{link}", { link: "https://evil.example" }, "https://example.org")).toBe("https://example.org");
  });
});

describe("computeSend", () => {
  const base = { to: ["a@example.org"], subject: "Hello" };

  it("builds an email link, a WhatsApp link and the character count", () => {
    const send = computeSend({ ...base, text: "Dear MP,\nThank you." });
    expect(send.email.url).toContain("mailto:a@example.org?subject=Hello");
    expect(send.whatsappUrl).toContain("https://wa.me/?text=");
    expect(send.characters).toBe("Dear MP,\nThank you.".length);
    expect(send.email.tooLong).toBe(false);
  });

  it("withholds the email link and says so when the message is too long", () => {
    const send = computeSend({ ...base, text: "x".repeat(MAILTO_MAX_LENGTH) });
    expect(send.email.tooLong).toBe(true);
    expect(send.email.url).toBeNull();
  });

  it("lists placeholders still to fill in", () => {
    expect(computeSend({ ...base, text: "Dear {mp_name}, from {town}" }).unfilled).toEqual(["mp_name", "town"]);
  });
});

describe("done store", () => {
  const memory = (initial?: string) => {
    let value = initial ?? null;
    return {
      getItem: () => value,
      setItem: (_: string, v: string) => {
        value = v;
      },
    };
  };

  it("starts empty", () => {
    expect(readDone(memory())).toEqual([]);
  });

  it("records a slug once", () => {
    const store = memory();
    expect(addDone(store, "a")).toEqual(["a"]);
    expect(addDone(store, "b")).toEqual(["a", "b"]);
    expect(addDone(store, "a")).toEqual(["a", "b"]);
    expect(readDone(store)).toEqual(["a", "b"]);
  });

  it("survives corrupt data", () => {
    expect(readDone(memory("not json"))).toEqual([]);
    expect(readDone(memory('{"a":1}'))).toEqual([]);
    expect(readDone(memory('["a", 3, null]'))).toEqual(["a"]);
  });

  it("survives storage that is missing or throws (private windows, blocked site data)", () => {
    expect(readDone(null)).toEqual([]);
    expect(addDone(null, "a")).toEqual(["a"]);
    const throwing = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(readDone(throwing)).toEqual([]);
    expect(addDone(throwing, "a")).toEqual(["a"]);
  });
});

describe("nextAction", () => {
  const actions = [
    { slug: "a", title: "A" },
    { slug: "b", title: "B" },
    { slug: "c", title: "C" },
  ];

  it("suggests the first action not yet done and not the current one", () => {
    expect(nextAction(["a"], actions, "b")).toEqual({ slug: "c", title: "C" });
    expect(nextAction([], actions, "a")).toEqual({ slug: "b", title: "B" });
  });

  it("returns null when everything is done", () => {
    expect(nextAction(["a", "b", "c"], actions, "c")).toBeNull();
  });
});
