import { describe, expect, it } from "vitest";
import { citationNumber, citedIds, plainCitations } from "../../src/lib/citations.ts";
import { countWords, readingMinutes } from "../../src/lib/text.ts";

describe("citedIds", () => {
  it("lists marker ids in order, with repeats", () => {
    expect(citedIds("A [[one]] B [[two]] C [[one]]")).toEqual(["one", "two", "one"]);
  });

  it("ignores things that are not markers", () => {
    expect(citedIds("[[Not Valid]] [single] [[x y]] text")).toEqual([]);
  });
});

describe("citationNumber", () => {
  it("numbers by position in the article's source list, from 1", () => {
    expect(citationNumber("b", ["a", "b", "c"])).toBe(2);
  });

  it("returns null for an id that is not in the list", () => {
    expect(citationNumber("z", ["a"])).toBeNull();
  });
});

describe("plainCitations", () => {
  it("turns markers into bracketed numbers for Markdown twins", () => {
    expect(plainCitations("Fact [[b]]. Another [[a]].", ["a", "b"])).toBe("Fact [2]. Another [1].");
  });

  it("leaves an unknown marker visible rather than hiding the problem", () => {
    expect(plainCitations("Fact [[zzz]].", ["a"])).toBe("Fact [[zzz]].");
  });
});

describe("countWords / readingMinutes", () => {
  it("counts words and ignores markdown punctuation and citation markers", () => {
    expect(countWords("One **two** three. [[x]] [four](/y)")).toBe(4);
  });

  it("rounds reading time up at 200 words a minute, minimum 1", () => {
    expect(readingMinutes(0)).toBe(1);
    expect(readingMinutes(200)).toBe(1);
    expect(readingMinutes(201)).toBe(2);
    expect(readingMinutes(600)).toBe(3);
  });
});
