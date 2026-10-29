import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";
import {
  absolutizeLinks,
  actionTwin,
  articleTwin,
  giveTwin,
  llmsFullTxt,
  llmsTxt,
  type TwinSource,
} from "../../src/lib/markdown-twin.ts";

const origin = "https://example.org";

const sources: TwinSource[] = [
  {
    title: "UN vote",
    publisher: "United Nations",
    url: "https://un.example/vote",
    published: new Date("2026-10-28"),
    origin: "un",
  },
  {
    title: "Cuban statement",
    publisher: "MINREX",
    url: "https://cu.example/s",
    published: null,
    origin: "cuban-government",
  },
];

const article = {
  id: "what-is-it",
  title: 'What "it" is',
  summary: "A summary: with a colon.",
  answer: "Short answer [[b]].",
  body: "Fact one [[a]]. See the [glossary](/glossary#embargo).\n\nFact two [[b]].",
  counterarguments: ["Others say otherwise [[b]]."],
  sourceIds: ["a", "b"],
  sources,
  published: new Date("2026-10-01"),
  reviewed: new Date("2026-10-29"),
  related: [{ title: "Write to DIRCO", url: "https://example.org/act/write-dirco" }],
};

function frontmatter(md: string): Record<string, unknown> {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(md);
  expect(match, "front matter present").not.toBeNull();
  return parseYaml(match![1]!) as Record<string, unknown>;
}

describe("absolutizeLinks", () => {
  it("makes site-relative links absolute and leaves other links alone", () => {
    expect(absolutizeLinks("[a](/x) [b](https://y.example/z) [c](#top)", origin)).toBe(
      "[a](https://example.org/x) [b](https://y.example/z) [c](#top)",
    );
  });
});

describe("articleTwin", () => {
  const md = articleTwin(article, origin);

  it("starts with valid YAML front matter carrying title, summary, dates and canonical URL", () => {
    const fm = frontmatter(md);
    expect(fm.title).toBe('What "it" is');
    expect(fm.summary).toBe("A summary: with a colon.");
    expect(fm.canonical).toBe("https://example.org/learn/what-is-it");
    expect(String(fm.reviewed)).toContain("2026-10-29");
    expect(fm.license).toBe("CC BY 4.0");
  });

  it("opens with the heading and the direct answer", () => {
    const body = md.replace(/^---\n[\s\S]*?\n---\n/, "");
    expect(body.startsWith('\n# What "it" is\n')).toBe(true);
    expect(md).toContain("> Short answer [2].");
  });

  it("numbers citations by the article's source order, same as the page", () => {
    expect(md).toContain("Fact one [1].");
    expect(md).toContain("Fact two [2].");
    expect(md).not.toContain("[[");
  });

  it("makes relative links absolute", () => {
    expect(md).toContain("(https://example.org/glossary#embargo)");
  });

  it("includes counterarguments and a numbered source list with origins", () => {
    expect(md).toContain("## Main counterarguments");
    expect(md).toContain("- Others say otherwise [2].");
    expect(md).toContain("1. UN vote. United Nations, 28 October 2026. https://un.example/vote (United Nations)");
    expect(md).toContain("2. Cuban statement. MINREX. https://cu.example/s (Cuban government)");
  });

  it("lists related actions with absolute URLs", () => {
    expect(md).toContain("[Write to DIRCO](https://example.org/act/write-dirco)");
  });

  it("ends with a single newline", () => {
    expect(md.endsWith("\n")).toBe(true);
    expect(md.endsWith("\n\n")).toBe(false);
  });
});

describe("actionTwin", () => {
  const md = actionTwin(
    {
      id: "write-dirco",
      title: "Write to DIRCO",
      summary: "Two minutes.",
      context: ["What it is.", "Who gets it."],
      targetName: "DIRCO",
      timeMinutes: 2,
      subject: "A request",
      template: "Dear Minister,\n\nI am {name}.\n\n{personal_reason}",
      sources,
      sourceIds: ["a", "b"],
      reviewed: new Date("2026-10-29"),
    },
    origin,
  );

  it("has front matter with the canonical URL", () => {
    expect(frontmatter(md).canonical).toBe("https://example.org/act/write-dirco");
  });

  it("shows the subject and the template with placeholders intact", () => {
    expect(md).toContain("Subject: A request");
    expect(md).toContain("I am {name}.");
    expect(md).toContain("{personal_reason}");
  });

  it("says the message is sent from the visitor's own app", () => {
    expect(md).toMatch(/own email app|own app|your own/i);
  });
});

describe("giveTwin", () => {
  it("says so plainly when nothing is listed", () => {
    expect(giveTwin([], origin)).toContain("No organisations are listed yet");
  });

  it("lists each organisation with its checks", () => {
    const md = giveTwin(
      [
        {
          name: "Org One",
          country: "US",
          delivers: "Medical supplies",
          recipientsInCuba: "Named hospitals",
          howMoneyReaches: "Shipments",
          payNote: "Pay by bank transfer.",
          registration: "12-3456789 (IRS)",
          website: "https://one.example",
          lastVerified: new Date("2026-10-29"),
        },
      ],
      origin,
    );
    expect(md).toContain("## Org One");
    expect(md).toContain("Medical supplies");
    expect(md).toContain("12-3456789 (IRS)");
    expect(md).toContain("- Paying: Pay by bank transfer.");
    expect(md).toContain("https://one.example");
    expect(md).toContain("29 October 2026");
  });
});

describe("llmsTxt", () => {
  const txt = llmsTxt(
    {
      articles: [{ id: "what-is-it", title: "What it is", summary: "A summary." }],
      actions: [{ id: "write-dirco", title: "Write to DIRCO", summary: "Two minutes." }],
    },
    origin,
  );

  it("follows the llms.txt shape: h1, blockquote summary, then sections", () => {
    const lines = txt.split("\n");
    expect(lines[0]).toBe("# Cuba Action Desk SA");
    expect(lines.find((l) => l.startsWith("> "))).toBeTruthy();
    for (const heading of ["## Learn", "## Act", "## Give", "## About"]) expect(txt).toContain(heading);
  });

  it("links each live article and action to its Markdown twin, absolute", () => {
    expect(txt).toContain("- [What it is](https://example.org/learn/what-is-it.md): A summary.");
    expect(txt).toContain("- [Write to DIRCO](https://example.org/act/write-dirco.md): Two minutes.");
    expect(txt).toContain("(https://example.org/give.md)");
  });
});

describe("llmsFullTxt", () => {
  it("joins the pages into one document with a header", () => {
    const out = llmsFullTxt(["# One\n", "# Two\n"], origin);
    expect(out.startsWith("# Cuba Action Desk SA")).toBe(true);
    expect(out).toContain("# One");
    expect(out).toContain("# Two");
    expect(out.indexOf("# One")).toBeLessThan(out.indexOf("# Two"));
  });
});
