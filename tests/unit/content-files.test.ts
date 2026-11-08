import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadContent } from "../../src/lib/content-files.ts";

let root: string;

const write = (collection: string, file: string, text: string) => {
  mkdirSync(join(root, collection), { recursive: true });
  writeFileSync(join(root, collection, file), text);
};

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "cad-content-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("loadContent", () => {
  it("treats a missing collection folder as empty", () => {
    const { set, issues } = loadContent(root);
    expect(set.actions).toEqual([]);
    expect(set.glossary).toEqual([]);
    expect(issues).toEqual([]);
  });

  it("loads a valid YAML entry, named after its file, and skips files starting with an underscore", () => {
    write("glossary", "embargo.yaml", 'term: "Embargo"\ndefinition: "A ban on trade."\n');
    write("glossary", "_draft.yaml", "not: valid: yaml: here");
    write("glossary", "notes.txt", "ignored");
    const { set, issues } = loadContent(root);
    expect(issues).toEqual([]);
    expect(set.glossary).toEqual([
      { id: "embargo", data: { term: "Embargo", definition: "A ban on trade.", sources: [] } },
    ]);
  });

  it("reports a Markdown file without frontmatter", () => {
    write("actions", "no-front.md", "Just a body.");
    expect(loadContent(root).issues).toEqual([
      { level: "error", where: "actions/no-front.md", message: "missing YAML frontmatter" },
    ]);
  });

  it("reports invalid YAML instead of throwing", () => {
    write("glossary", "broken.yaml", "term: [unclosed");
    const { issues, set } = loadContent(root);
    expect(set.glossary).toEqual([]);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toMatch(/^invalid YAML: /);
  });

  it("reports each schema problem with its field path, or (root) when the file is not an object", () => {
    write("glossary", "empty-term.yaml", 'term: ""\ndefinition: "Fine."\n');
    write("glossary", "scalar.yaml", "just a sentence");
    const messages = loadContent(root).issues.map((i) => `${i.where} ${i.message}`);
    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatch(/^glossary\/empty-term\.yaml term: /);
    expect(messages[1]).toMatch(/^glossary\/scalar\.yaml \(root\): /);
  });
});
