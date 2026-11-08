import { describe, expect, it } from "vitest";
import { targetSchema } from "../../src/content/schemas.ts";
import { contactsOf } from "../../src/lib/targets.ts";

const base = { id: "mps", name: "Members of Parliament", channel: "email" };

describe("contactsOf", () => {
  it("is the target itself when it has no options", () => {
    const contacts = contactsOf(targetSchema.parse({ ...base, address: "mp@example.org" }));
    expect(contacts.map((c) => c.id)).toEqual(["mps"]);
    expect(contacts[0]?.address).toBe("mp@example.org");
  });

  it("lists each option, keeping a note only where one is given", () => {
    const contacts = contactsOf(
      targetSchema.parse({
        ...base,
        options: [
          { id: "chair", name: "Committee chair", address: "chair@example.org", note: "Keep it under 300 words." },
          { id: "clerk", name: "Committee clerk", address: "clerk@example.org" },
        ],
      }),
    );
    expect(contacts[0]?.note).toBe("Keep it under 300 words.");
    expect(contacts[1]).not.toHaveProperty("note");
  });
});
