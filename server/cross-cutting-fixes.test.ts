/**
 * Cross-Cutting Fixes — Vitest Tests
 *
 * CC-01: All mutations now have onError handlers
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";

const PAGES_WITH_FIXES = [
  { file: "client/src/pages/MemoryPage.tsx", mutations: ["bulkAdd", "delete"], minOnError: 3 },
  { file: "client/src/pages/SchedulePage.tsx", mutations: ["toggle", "delete"], minOnError: 3 },
  { file: "client/src/pages/MeetingsPage.tsx", mutations: ["create"], minOnError: 2 },
  { file: "client/src/pages/TaskView.tsx", mutations: ["rateTask", "transcribe"], minOnError: 5 },
  { file: "client/src/pages/WebAppBuilderPage.tsx", mutations: ["create", "update"], minOnError: 4 },
];

describe("CC-01: All mutations have onError handlers", () => {
  for (const page of PAGES_WITH_FIXES) {
    it(`${page.file} has at least ${page.minOnError} onError handlers`, () => {
      const source = fs.readFileSync(page.file, "utf-8");
      const onErrorCount = (source.match(/onError/g) || []).length;
      expect(onErrorCount).toBeGreaterThanOrEqual(page.minOnError);
    });
  }

  it("no useMutation() calls without configuration object", () => {
    for (const page of PAGES_WITH_FIXES) {
      const source = fs.readFileSync(page.file, "utf-8");
      // Check for bare useMutation() with no arguments - these are the ones missing onError
      const bareMatches = source.match(/useMutation\(\)/g) || [];
      expect(bareMatches.length).toBe(0);
    }
  });
});
