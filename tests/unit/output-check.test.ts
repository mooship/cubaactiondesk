import { describe, expect, it } from "vitest";
import { checkOutput, type OutputSite } from "../../src/lib/output-check.ts";

const origin = "https://example.org";

const html = (body: string, head = "") =>
  `<!doctype html><html lang="en-ZA"><head><title>A page, Cuba Action Desk SA</title>` +
  `<meta name="description" content="A short description.">` +
  `<link rel="canonical" href="${origin}/x">${head}</head><body><main><h1>Title</h1>${body}</main></body></html>`;

function site(overrides: Partial<OutputSite> = {}): OutputSite {
  const files: Record<string, string> = {
    "index.html": html('<a href="/learn/one">One</a> <a href="/act/do-it">Do it</a> <a href="/give">Give</a>'),
    "learn/one.html": html('<h2 id="source-1">S</h2><a href="#source-1">1</a> <a href="/glossary#embargo">e</a>'),
    "learn/one.md": "# One\n",
    "give.md": "# Give\n",
    "act/do-it.md": "# Do it\n",
    "glossary.html": html('<dt id="embargo">Embargo</dt>'),
    "sitemap-0.xml": `<urlset><url><loc>${origin}/</loc></url><url><loc>${origin}/learn/one</loc></url><url><loc>${origin}/act/do-it</loc></url><url><loc>${origin}/give</loc></url></urlset>`,
    "llms.txt": `# Site\n\n- [One](${origin}/learn/one.md): x\n- [Do it](${origin}/act/do-it.md): x\n- [Give](${origin}/give.md): x\n`,
  };
  return {
    origin,
    files: new Map(Object.entries(files)),
    serverRoutes: [/^\/give$/, /^\/act$/, /^\/act\/do-it$/, /^\/go\/[^/]+$/, /^\/api\//],
    ...overrides,
  };
}

const messages = (s: OutputSite) => checkOutput(s).map((i) => `${i.where}: ${i.message}`);

describe("checkOutput", () => {
  it("passes a consistent site", () => {
    expect(messages(site())).toEqual([]);
  });

  it("flags an internal link to a page that does not exist", () => {
    const s = site();
    s.files.set("index.html", html('<a href="/learn/missing">x</a>'));
    expect(messages(s).join("\n")).toMatch(/\/learn\/missing/);
  });

  it("does not flag links to server-rendered routes or /go and /api", () => {
    const s = site();
    s.files.set("index.html", html('<a href="/act">a</a><a href="/go/some-org">b</a><a href="/api/health">c</a>'));
    expect(messages(s)).toEqual([]);
  });

  it("flags a link to an anchor that is not on the target page", () => {
    const s = site();
    s.files.set("index.html", html('<a href="/glossary#nope">x</a>'));
    expect(messages(s).join("\n")).toMatch(/#nope/);
  });

  it("flags a same-page anchor with no matching id", () => {
    const s = site();
    s.files.set("learn/one.html", html('<a href="#source-9">9</a>'));
    expect(messages(s).join("\n")).toMatch(/#source-9/);
  });

  it("ignores external, mailto and tel links", () => {
    const s = site();
    s.files.set(
      "index.html",
      html('<a href="https://x.example/y">x</a><a href="mailto:a@b.c">m</a><a href="tel:1">t</a>'),
    );
    expect(messages(s)).toEqual([]);
  });

  it("requires a Markdown twin for every article and for Give", () => {
    const s = site();
    s.files.delete("learn/one.md");
    s.files.delete("give.md");
    const out = messages(s).join("\n");
    expect(out).toMatch(/learn\/one\.md/);
    expect(out).toMatch(/give\.md/);
  });

  it("requires a Markdown twin for every live action in the sitemap", () => {
    const s = site();
    s.files.delete("act/do-it.md");
    expect(messages(s).join("\n")).toMatch(/act\/do-it\.md/);
  });

  it("requires llms.txt to list every article and action, and every link in it to resolve", () => {
    const s = site();
    s.files.set("llms.txt", `# Site\n\n- [One](${origin}/learn/one.md): x\n- [Gone](${origin}/learn/gone.md): x\n`);
    const out = messages(s).join("\n");
    expect(out).toMatch(/do-it/);
    expect(out).toMatch(/learn\/gone\.md/);
  });

  it("flags a sitemap entry that does not resolve", () => {
    const s = site();
    s.files.set("sitemap-0.xml", `<urlset><url><loc>${origin}/learn/nowhere</loc></url></urlset>`);
    expect(messages(s).join("\n")).toMatch(/nowhere/);
  });

  it("flags a space missing before a link", () => {
    const s = site();
    s.files.set("about.html", html('<p>licensed<a href="/give">CC</a></p>'));
    expect(messages(s).join("\n")).toMatch(/about\.html.*licensed/);
  });

  it("checks page basics: one h1, lang, canonical, title and description lengths, image alt", () => {
    const s = site();
    s.files.set(
      "bad.html",
      "<html><head><title>" +
        "x".repeat(70) +
        "</title></head><body><h1>a</h1><h1>b</h1><img src='/a.png'></body></html>",
    );
    const out = messages(s).join("\n");
    expect(out).toMatch(/bad\.html.*h1/);
    expect(out).toMatch(/bad\.html.*lang/);
    expect(out).toMatch(/bad\.html.*canonical/);
    expect(out).toMatch(/bad\.html.*title/);
    expect(out).toMatch(/bad\.html.*description/);
    expect(out).toMatch(/bad\.html.*alt/);
  });

  it("measures the visible title, not its escaped form (an apostrophe is one character, not five)", () => {
    const s = site();
    const visible = `Cuba's ${"x".repeat(60 - ", Cuba Action Desk SA".length - "Cuba's ".length)}, Cuba Action Desk SA`;
    expect(visible).toHaveLength(60);
    const escaped = visible.replace("'", () => "&#39;");
    s.files.set(
      "about.html",
      html("<p>ok</p>").replace(/<title>[^<]*<\/title>/, () => `<title>${escaped}</title>`),
    );
    expect(messages(s)).toEqual([]);
  });

  it("skips the 404 page for canonical and title checks", () => {
    const s = site();
    s.files.set(
      "404.html",
      '<html lang="en-ZA"><head><title>Not found</title><meta name="description" content="x"></head><body><main><h1>Not found</h1></main></body></html>',
    );
    expect(messages(s)).toEqual([]);
  });
});
