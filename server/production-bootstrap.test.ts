import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { build } from "esbuild";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");
const pkg = JSON.parse(readFileSync(resolve(projectRoot, "package.json"), "utf8"));

function packageName(specifier: string) {
  if (specifier.startsWith("node:") || specifier.startsWith(".")) return null;
  const parts = specifier.split("/");
  return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

describe("production server bootstrap", () => {
  it("does not eagerly import development-only packages into dist/index.js", async () => {
    const result = await build({
      entryPoints: [resolve(projectRoot, "server/_core/index.ts")],
      bundle: true,
      platform: "node",
      packages: "external",
      format: "esm",
      write: false,
      outfile: "dist/index.js",
    });
    const output = result.outputFiles[0].text;
    // esbuild emits ESM imports with double quotes. Generated source-code strings
    // in the webapp builder use single quotes and are not module-level imports.
    const eagerImports = [...output.matchAll(/^import\s.+?\sfrom\s"([^"]+)";?$/gm)]
      .map(match => packageName(match[1]))
      .filter((name): name is string => Boolean(name));
    const missingAtRuntime = eagerImports.filter(name =>
      name in pkg.devDependencies && !(name in pkg.dependencies)
    );
    expect(missingAtRuntime).toEqual([]);
    // Vite must still be available for development, but loaded only on that path.
    expect(output).toContain('import("vite")');
  });
});

describe("production liveness", () => {
  it("registers the Docker health-check path before the SPA fallback", () => {
    const dockerfile = readFileSync(resolve(projectRoot, "Dockerfile"), "utf8");
    const server = readFileSync(resolve(projectRoot, "server/_core/index.ts"), "utf8");
    expect(dockerfile).toContain("/healthz");
    const routePosition = server.indexOf('app.get("/healthz"');
    expect(routePosition).toBeGreaterThanOrEqual(0);
    expect(routePosition).toBeLessThan(server.indexOf("serveStatic(app)"));
  });
});
