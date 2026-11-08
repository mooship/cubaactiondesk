import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts"],
    coverage: {
      provider: "v8",
      // The typed logic modules. Pages, scripts and the link-checker Worker are thin wiring around these and are
      // covered by the build, the check:* scripts and the browser tests instead.
      include: ["src/lib/**/*.ts"],
      reporter: ["text"],
      thresholds: { statements: 95, branches: 95, functions: 100, lines: 100 },
    },
  },
});
