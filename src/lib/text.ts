/** Words in Markdown text, ignoring syntax characters, link targets and `[[source]]` markers. */
export function countWords(text: string): number {
  const plain = text
    .replaceAll(/\[\[[a-z0-9-]+\]\]/g, " ")
    .replaceAll(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replaceAll(/[*_`>#]/g, " ");
  return plain.split(/\s+/).filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
}

/** Reading time at 200 words a minute, rounded up, never below one minute. */
export function readingMinutes(words: number): number {
  return Math.max(1, Math.ceil(words / 200));
}

/** Minutes to read an article: its opening answer plus its body. */
export function articleReadingMinutes(answer: string, body: string | undefined): number {
  return readingMinutes(countWords(`${answer}\n${body ?? ""}`));
}
