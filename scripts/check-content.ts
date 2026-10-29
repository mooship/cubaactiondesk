// CI gate for content: schema shape plus the cross-collection rules.
// Errors exit 1. Warnings (stale contacts, overdue reviews) are printed for the editor.
import { checkContent } from "../src/lib/content-check.ts";
import { loadSiteContent } from "../src/lib/content-files.ts";

const { set, issues: loadIssues } = loadSiteContent();
// Cross-collection checks only make sense once every file parsed.
const issues = loadIssues.some((i) => i.level === "error")
  ? loadIssues
  : [...loadIssues, ...checkContent(set, new Date())];

const counts = Object.entries(set).map(([name, entries]) => `${entries.length} ${name}`);
console.log(`Content: ${counts.join(", ")}`);

for (const level of ["error", "warning"] as const) {
  for (const issue of issues.filter((i) => i.level === level)) {
    console.log(`${level === "error" ? "ERROR  " : "warning"} ${issue.where}: ${issue.message}`);
  }
}

const errors = issues.filter((i) => i.level === "error").length;
const warnings = issues.length - errors;
console.log(`${errors} error(s), ${warnings} warning(s)`);
process.exit(errors > 0 ? 1 : 0);
