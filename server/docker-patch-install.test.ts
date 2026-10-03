import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const dockerfile = readFileSync(resolve(root, "Dockerfile"), "utf8");
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const stages = dockerfile.split(/(?=^FROM\s)/m).filter(stage => stage.startsWith("FROM "));
const localDependencies = Object.values({ ...pkg.dependencies, ...pkg.devDependencies })
  .filter((version): version is string => typeof version === "string" && version.startsWith("file:packages/"));

for (const stageName of ["deps", "build"] as const) {
  describe(`Docker ${stageName} stage local dependency inputs`, () => {
    const stage = stages.find(item => new RegExp(`^FROM\\s+\\S+\\s+AS\\s+${stageName}\\b`, "i").test(item));

    it("copies the tracked patch directory before installing packages", () => {
      expect(stage).toBeDefined();
      const copyPosition = stage!.indexOf("COPY patches ./patches");
      const installPosition = stage!.indexOf("pnpm install --frozen-lockfile");
      expect(copyPosition).toBeGreaterThanOrEqual(0);
      expect(installPosition).toBeGreaterThan(copyPosition);
    });

    it("copies all local file-based packages before installing packages", () => {
      expect(localDependencies.length).toBeGreaterThan(0);
      const copyPosition = stage!.indexOf("COPY packages ./packages");
      const installPosition = stage!.indexOf("pnpm install --frozen-lockfile");
      expect(copyPosition).toBeGreaterThanOrEqual(0);
      expect(installPosition).toBeGreaterThan(copyPosition);
      for (const version of localDependencies) {
        expect(existsSync(resolve(root, version.slice("file:".length), "package.json"))).toBe(true);
      }
    });

    it("contains the patch file referenced by package.json", () => {
      const patchPath = pkg.pnpm.patchedDependencies["wouter@3.7.1"];
      expect(patchPath).toBe("patches/wouter@3.7.1.patch");
      expect(existsSync(resolve(root, patchPath))).toBe(true);
    });
  });
}
