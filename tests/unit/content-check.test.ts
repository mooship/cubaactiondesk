import { describe, expect, it } from "vitest";
import {
  actionSchema,
  articleSchema,
  fundraiserSchema,
  glossarySchema,
  sourceSchema,
  targetSchema,
} from "../../src/content/schemas.ts";
import { checkContent, type ContentSet, type Issue } from "../../src/lib/content-check.ts";

const TODAY = new Date("2026-10-29T00:00:00Z");
const daysAgo = (n: number) => new Date(TODAY.getTime() - n * 86_400_000).toISOString().slice(0, 10);

const words = (n: number) => Array.from({ length: n }, () => "word").join(" ");

function validSet(): ContentSet {
  return {
    sources: [
      {
        id: "src-a",
        data: sourceSchema.parse({
          id: "src-a",
          title: "A",
          publisher: "P",
          origin: "un",
          url: "https://example.org/a",
          accessed: "2026-10-01",
        }),
      },
      {
        id: "src-b",
        data: sourceSchema.parse({
          id: "src-b",
          title: "B",
          publisher: "P",
          origin: "news",
          url: "https://example.org/b",
          accessed: "2026-10-01",
        }),
      },
    ],
    targets: [
      {
        id: "dirco",
        data: targetSchema.parse({
          id: "dirco",
          name: "DIRCO",
          channel: "email",
          address: "x@example.org",
          sourceUrl: "https://example.org/contact",
          lastVerified: daysAgo(10),
        }),
      },
    ],
    actions: [
      {
        id: "write-dirco",
        body: "Dear Minister,\n\nI am {name} from {town}.\n\n{personal_reason}\n\n{own_view}\n\nThank you.",
        data: actionSchema.parse({
          slug: "write-dirco",
          title: "Write to DIRCO",
          summary: "Two minutes.",
          context: ["One", "Two", "Three"],
          target: "dirco",
          channel: "email",
          timeMinutes: 2,
          subject: "A request",
          placeholders: [
            { key: "name", label: "Name", kind: "identity" },
            { key: "town", label: "Town", kind: "identity" },
            { key: "personal_reason", label: "Why", kind: "own_words" },
            { key: "own_view", label: "View", kind: "own_words" },
          ],
          sources: ["src-a"],
          status: "live",
          reviewed: "2026-10-28",
        }),
      },
    ],
    articles: [
      {
        id: "what-is-it",
        body: "Fact one [[src-a]]. Fact two [[src-b]].",
        data: articleSchema.parse({
          title: "What it is",
          summary: "A summary.",
          answer: "Direct answer [[src-a]].",
          published: "2026-10-01",
          reviewed: daysAgo(30),
          sources: ["src-a", "src-b"],
          relatedActions: ["write-dirco"],
          counterarguments: ["Some argue otherwise [[src-b]]."],
          status: "live",
        }),
      },
    ],
    fundraisers: [],
    glossary: [],
  };
}

const errors = (issues: Issue[]) => issues.filter((i) => i.level === "error").map((i) => i.message);
const warnings = (issues: Issue[]) => issues.filter((i) => i.level === "warning").map((i) => i.message);

describe("checkContent: baseline", () => {
  it("passes a complete, consistent set with no issues", () => {
    expect(checkContent(validSet(), TODAY)).toEqual([]);
  });
});

describe("checkContent: actions", () => {
  it("flags a slug that does not match the file name", () => {
    const set = validSet();
    set.actions[0]!.id = "other-name";
    expect(errors(checkContent(set, TODAY)).join("\n")).toMatch(/slug/i);
  });

  it("flags a missing target", () => {
    const set = validSet();
    set.targets = [];
    expect(errors(checkContent(set, TODAY)).join("\n")).toMatch(/target.*dirco/i);
  });

  it("flags a missing source", () => {
    const set = validSet();
    set.actions[0]!.data.sources = ["nope"];
    expect(errors(checkContent(set, TODAY)).join("\n")).toMatch(/source.*nope/i);
  });

  it("refuses a live action whose target contact is unverified", () => {
    const set = validSet();
    set.targets[0]!.data.address = null;
    expect(errors(checkContent(set, TODAY)).join("\n")).toMatch(/unverified|address/i);
  });

  it("refuses a live action whose target has no source URL or verification date", () => {
    const set = validSet();
    set.targets[0]!.data.sourceUrl = null;
    expect(errors(checkContent(set, TODAY)).join("\n")).toMatch(/source/i);
    const set2 = validSet();
    set2.targets[0]!.data.lastVerified = null;
    expect(errors(checkContent(set2, TODAY)).join("\n")).toMatch(/verif/i);
  });

  it("refuses a [VERIFY] placeholder address on a live action", () => {
    const set = validSet();
    set.targets[0]!.data.address = "[VERIFY]";
    expect(errors(checkContent(set, TODAY)).length).toBeGreaterThan(0);
  });

  it("allows a draft action to point at an unverified target", () => {
    const set = validSet();
    set.targets[0]!.data.address = null;
    set.actions[0]!.data.status = "draft";
    set.articles[0]!.data.status = "draft"; // a live article must link to a live action
    expect(errors(checkContent(set, TODAY))).toEqual([]);
  });

  it("does not need an address when the sender supplies it", () => {
    const set = validSet();
    Object.assign(set.targets[0]!.data, { addressRequired: false, address: null, sourceUrl: null, lastVerified: null });
    expect(errors(checkContent(set, TODAY))).toEqual([]);
  });

  it("warns, but does not fail, when a verified contact is over 90 days old", () => {
    const set = validSet();
    set.targets[0]!.data.lastVerified = new Date(daysAgo(91));
    const issues = checkContent(set, TODAY);
    expect(errors(issues)).toEqual([]);
    expect(warnings(issues).join("\n")).toMatch(/90 days/);
  });

  it("does not warn at exactly 90 days", () => {
    const set = validSet();
    set.targets[0]!.data.lastVerified = new Date(daysAgo(90));
    expect(warnings(checkContent(set, TODAY))).toEqual([]);
  });

  describe("targets with several contact options (letters to the editor)", () => {
    const option = (name: string, patch: Record<string, unknown> = {}) => ({
      id: name.toLowerCase().replaceAll(/\W+/g, "-"),
      name,
      address: `${name.toLowerCase().replaceAll(/\W+/g, "")}@example.org`,
      sourceUrl: "https://example.org/letters",
      lastVerified: new Date(daysAgo(5)),
      ...patch,
    });

    it("lets a live action through when at least one option is verified", () => {
      const set = validSet();
      Object.assign(set.targets[0]!.data, {
        address: null,
        sourceUrl: null,
        lastVerified: null,
        options: [option("Paper One"), option("Paper Two", { address: null })],
      });
      expect(errors(checkContent(set, TODAY))).toEqual([]);
    });

    it("refuses a live action when no option is verified", () => {
      const set = validSet();
      Object.assign(set.targets[0]!.data, {
        address: null,
        options: [option("Paper One", { lastVerified: null }), option("Paper Two", { sourceUrl: null })],
      });
      expect(errors(checkContent(set, TODAY)).join("\n")).toMatch(/no verified contact/i);
    });

    it("warns about each stale option separately", () => {
      const set = validSet();
      Object.assign(set.targets[0]!.data, {
        options: [option("Paper One", { lastVerified: new Date(daysAgo(120)) }), option("Paper Two")],
      });
      const stale = warnings(checkContent(set, TODAY)).filter((w) => /90 days/.test(w));
      expect(stale).toHaveLength(1);
      expect(stale[0]).toMatch(/Paper One/);
    });
  });

  it("flags a body placeholder that has no input defined", () => {
    const set = validSet();
    set.actions[0]!.body += "\n{surprise}";
    expect(errors(checkContent(set, TODAY)).join("\n")).toMatch(/surprise/);
  });

  it("allows the reserved {link} placeholder without an input", () => {
    const set = validSet();
    set.actions[0]!.body += "\n{link}";
    expect(errors(checkContent(set, TODAY))).toEqual([]);
  });

  it("needs at least two blanks the sender writes in their own words", () => {
    const set = validSet();
    set.actions[0]!.data.placeholders = set.actions[0]!.data.placeholders.filter((p) => p.key !== "own_view");
    set.actions[0]!.body = set.actions[0]!.body!.replace("{own_view}", "");
    expect(errors(checkContent(set, TODAY)).join("\n")).toMatch(/own words/i);
  });

  it("enforces the 200 word limit", () => {
    const set = validSet();
    set.actions[0]!.body += `\n${words(200)}`;
    expect(errors(checkContent(set, TODAY)).join("\n")).toMatch(/200 words/);
  });

  it("needs a subject for email and letters", () => {
    const set = validSet();
    set.actions[0]!.data.subject = undefined;
    expect(errors(checkContent(set, TODAY)).join("\n")).toMatch(/subject/i);
  });

  it("needs at least one source for email and letters", () => {
    const set = validSet();
    set.actions[0]!.data.sources = [];
    expect(errors(checkContent(set, TODAY)).join("\n")).toMatch(/source/i);
  });

  it("needs the shared article to exist", () => {
    const set = validSet();
    set.actions[0]!.data.shareArticle = "ghost";
    expect(errors(checkContent(set, TODAY)).join("\n")).toMatch(/ghost/);
  });
});

describe("checkContent: articles", () => {
  it("flags a marker whose source is not in the article's list", () => {
    const set = validSet();
    set.articles[0]!.body += " [[src-zzz]]";
    expect(errors(checkContent(set, TODAY)).join("\n")).toMatch(/src-zzz/);
  });

  it("flags markers in the answer and counterarguments too", () => {
    const set = validSet();
    set.articles[0]!.data.answer = "Answer [[ghost-one]].";
    set.articles[0]!.data.counterarguments = ["Other view [[ghost-two]]."];
    const out = errors(checkContent(set, TODAY)).join("\n");
    expect(out).toMatch(/ghost-one/);
    expect(out).toMatch(/ghost-two/);
  });

  it("warns about a listed source that is never cited", () => {
    const set = validSet();
    set.articles[0]!.body = "Fact one [[src-a]].";
    set.articles[0]!.data.counterarguments = ["Other view."];
    expect(warnings(checkContent(set, TODAY)).join("\n")).toMatch(/src-b/);
  });

  it("flags a source listed that does not exist", () => {
    const set = validSet();
    set.articles[0]!.data.sources = ["src-a", "missing-src"];
    expect(errors(checkContent(set, TODAY)).join("\n")).toMatch(/missing-src/);
  });

  it("requires a live article to have counterarguments", () => {
    const set = validSet();
    set.articles[0]!.data.counterarguments = [];
    expect(errors(checkContent(set, TODAY)).join("\n")).toMatch(/counterarguments/i);
  });

  it("requires a live article to link to at least one action", () => {
    const set = validSet();
    set.articles[0]!.data.relatedActions = [];
    expect(errors(checkContent(set, TODAY)).join("\n")).toMatch(/action/i);
  });

  it("flags a related action that does not exist", () => {
    const set = validSet();
    set.articles[0]!.data.relatedActions = ["ghost"];
    expect(errors(checkContent(set, TODAY)).join("\n")).toMatch(/ghost/);
  });

  it("does not hold a draft article to the live requirements", () => {
    const set = validSet();
    set.articles[0]!.data.status = "draft";
    set.articles[0]!.data.counterarguments = [];
    set.articles[0]!.data.relatedActions = [];
    expect(errors(checkContent(set, TODAY))).toEqual([]);
  });

  it("warns when a live article is overdue its six-month review", () => {
    const set = validSet();
    set.articles[0]!.data.reviewed = new Date(daysAgo(200));
    expect(warnings(checkContent(set, TODAY)).join("\n")).toMatch(/review/i);
  });
});

describe("checkContent: page titles (under 60 characters with the site name)", () => {
  it("warns when an article's full page title would be cut off in search results", () => {
    const set = validSet();
    set.articles[0]!.data.title = "A title long enough that it pushes the whole page title past sixty characters";
    expect(warnings(checkContent(set, TODAY)).join("\n")).toMatch(/title.*characters/i);
  });

  it("warns for an action too", () => {
    const set = validSet();
    set.actions[0]!.data.title = "An action title that is much too long once the site name is added to it";
    expect(warnings(checkContent(set, TODAY)).join("\n")).toMatch(/title.*characters/i);
  });

  it("is quiet at exactly 60 characters", () => {
    const set = validSet();
    const suffix = ", Cuba Action Desk SA";
    set.articles[0]!.data.title = "x".repeat(60 - suffix.length);
    expect(warnings(checkContent(set, TODAY))).toEqual([]);
  });
});

describe("checkContent: fundraisers", () => {
  const approved = () =>
    fundraiserSchema.parse({
      id: "org-one",
      name: "Org One",
      country: "US",
      category: "humanitarian",
      website: "https://example.org",
      donateUrl: "https://example.org/donate",
      registration: { number: "12-3456789", body: "IRS" },
      delivers: "Medical supplies",
      howMoneyReaches: "Shipments",
      recipientsInCuba: "Named hospitals",
      activeSince: "2015-01-01",
      evidence: [{ label: "Report", url: "https://example.org/report" }],
      onlinePayment: "card",
      approved: true,
      lastVerified: daysAgo(5),
    });

  it("passes a fully vetted listing", () => {
    const set = validSet();
    set.fundraisers = [{ id: "org-one", data: approved() }];
    expect(checkContent(set, TODAY)).toEqual([]);
  });

  it.each([
    ["registration", { registration: null }],
    ["evidence", { evidence: [] }],
    ["recipients", { recipientsInCuba: null }],
    ["how money reaches", { howMoneyReaches: null }],
    ["verified", { lastVerified: null }],
    ["online card", { onlinePayment: "unconfirmed" as const }],
  ])("refuses approval without %s", (label, patch) => {
    const set = validSet();
    set.fundraisers = [{ id: "org-one", data: { ...approved(), ...patch } }];
    expect(errors(checkContent(set, TODAY)).join("\n").toLowerCase()).toContain(label.toLowerCase());
  });

  it("accepts either an online card form or bank transfer as the way to pay from abroad", () => {
    for (const onlinePayment of ["card", "bank-transfer"] as const) {
      const set = validSet();
      set.fundraisers = [{ id: "org-one", data: { ...approved(), onlinePayment } }];
      expect(errors(checkContent(set, TODAY))).toEqual([]);
    }
  });

  it("needs 12 months of activity unless run by a listed organisation", () => {
    const set = validSet();
    set.fundraisers = [{ id: "org-one", data: { ...approved(), activeSince: new Date(daysAgo(200)) } }];
    expect(errors(checkContent(set, TODAY)).join("\n")).toMatch(/12 months/);

    const parent = { id: "parent", data: { ...approved(), id: "parent" } };
    set.fundraisers = [
      parent,
      { id: "org-one", data: { ...approved(), activeSince: new Date(daysAgo(200)), runBy: "parent" } },
    ];
    expect(errors(checkContent(set, TODAY))).toEqual([]);
  });

  it("refuses runBy that points at nothing or at an unapproved organisation", () => {
    const set = validSet();
    set.fundraisers = [{ id: "org-one", data: { ...approved(), activeSince: new Date(daysAgo(200)), runBy: "ghost" } }];
    expect(errors(checkContent(set, TODAY)).join("\n")).toMatch(/ghost/);
  });

  it("does not hold an unapproved candidate to the vetting rules", () => {
    const set = validSet();
    set.fundraisers = [
      {
        id: "candidate",
        data: { ...approved(), id: "candidate", approved: false, registration: null, evidence: [], lastVerified: null },
      },
    ];
    expect(errors(checkContent(set, TODAY))).toEqual([]);
  });

  it("flags an id that does not match the file name", () => {
    const set = validSet();
    set.fundraisers = [{ id: "file-name", data: approved() }];
    expect(errors(checkContent(set, TODAY)).join("\n")).toMatch(/id/i);
  });
});

describe("checkContent: glossary", () => {
  it("flags a glossary term citing a source that does not exist", () => {
    const set = validSet();
    set.glossary = [
      { id: "embargo", data: glossarySchema.parse({ term: "Embargo", definition: "A ban.", sources: ["nope"] }) },
    ];
    expect(errors(checkContent(set, TODAY)).join("\n")).toMatch(/nope/);
  });
});
