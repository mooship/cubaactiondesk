import { beforeEach, describe, expect, it, vi } from "vitest";
import { getLiveAction, getLiveArticles } from "../../src/lib/content.ts";
import { actionTwinFor, articleTwinFor, giveTwinFor, llmsFullTxtFor, llmsTxtFor } from "../../src/lib/twins.ts";
import { collections } from "../helpers/fake-content.ts";

vi.mock("astro:content", () => import("../helpers/fake-content.ts"));

const origin = "https://example.org";
const reviewed = new Date("2026-10-30");

const article = {
  id: "the-laws",
  data: {
    status: "live",
    title: "The laws",
    summary: "Which US laws make up the blockade.",
    answer: "Several laws [[un-vote]].",
    counterarguments: [],
    sources: ["un-vote"],
    published: new Date("2026-10-01"),
    reviewed,
    relatedActions: ["write-dirco", "draft-action"],
  },
  body: "The first law [[un-vote]].",
};

const liveAction = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  data: {
    status: "live",
    featured: false,
    title: `Action ${id}`,
    summary: "Write to the department.",
    context: ["One line of context."],
    target: "dirco",
    timeMinutes: 5,
    subject: "Cuba",
    sources: ["un-vote"],
    reviewed,
    ...extra,
  },
  body: "Dear Minister, read {link}. [your name]",
});

beforeEach(() => {
  collections.clear();
  collections.set("sources", [
    {
      id: "un-vote",
      data: {
        title: "UN vote",
        publisher: "United Nations",
        url: "https://un.example/vote",
        published: null,
        origin: "un",
      },
    },
  ]);
  collections.set("targets", [{ id: "dirco", data: { name: "DIRCO" } }]);
  collections.set("articles", [article]);
  collections.set("actions", [
    liveAction("write-dirco", { shareArticle: "the-laws" }),
    liveAction("draft-action", { status: "draft" }),
  ]);
  collections.set("fundraisers", [
    {
      id: "aid",
      data: {
        approved: true,
        name: "Aid Org",
        country: "Canada",
        delivers: "Medicine",
        recipientsInCuba: null,
        howMoneyReaches: null,
        registration: { number: "12345", body: "CRA" },
        website: "https://aid.example",
        lastVerified: null,
      },
    },
    {
      id: "plain",
      data: {
        approved: true,
        name: "Plain Org",
        country: "Spain",
        delivers: "Food",
        recipientsInCuba: null,
        howMoneyReaches: null,
        payNote: "Bank transfer only.",
        website: "https://plain.example",
        lastVerified: null,
      },
    },
  ]);
});

describe("articleTwinFor", () => {
  it("numbers the sources and links only the live related actions", async () => {
    const [entry] = await getLiveArticles();
    const md = await articleTwinFor(entry!, origin);
    expect(md).toContain("1. UN vote. United Nations. https://un.example/vote (United Nations)");
    expect(md).toContain("- [Action write-dirco](https://example.org/act/write-dirco)");
    expect(md).not.toContain("draft-action");
  });

  it("copes with an article that has no body", async () => {
    const [entry] = await getLiveArticles();
    const md = await articleTwinFor({ ...entry!, body: undefined }, origin);
    expect(md).toContain("# The laws");
  });
});

describe("actionTwinFor", () => {
  it("names the target and fills the share link with the linked article", async () => {
    const md = await actionTwinFor((await getLiveAction("write-dirco"))!, origin);
    expect(md).toContain("Goes to: DIRCO.");
    expect(md).toContain("read https://example.org/learn/the-laws.");
  });

  it("leaves the link blank when the action shares no article, and copes with no body", async () => {
    collections.get("actions")?.push(liveAction("bare"));
    const entry = (await getLiveAction("bare"))!;
    const md = await actionTwinFor({ ...entry, body: undefined }, origin);
    expect(md).toContain("# Action bare");
    expect(md).not.toContain("/learn/");
  });
});

describe("giveTwinFor", () => {
  it("lists approved organisations with their registration and payment note", async () => {
    const md = await giveTwinFor(origin);
    expect(md).toContain("- Registration: 12345 (CRA)");
    expect(md).toContain("- Paying: Bank transfer only.");
    expect(md.match(/- Registration:/g)).toHaveLength(1);
  });
});

describe("llms.txt", () => {
  it("indexes live articles and actions", async () => {
    const txt = await llmsTxtFor(origin);
    expect(txt).toContain("[The laws](https://example.org/learn/the-laws.md)");
    expect(txt).toContain("[Action write-dirco](https://example.org/act/write-dirco.md)");
    expect(txt).not.toContain("draft-action.md");
  });

  it("concatenates every live page in llms-full.txt", async () => {
    const txt = await llmsFullTxtFor(origin);
    expect(txt).toContain("# The laws");
    expect(txt).toContain("# Action write-dirco");
    expect(txt).toContain("# Give");
    expect(txt).not.toContain("# Action draft-action");
  });
});
