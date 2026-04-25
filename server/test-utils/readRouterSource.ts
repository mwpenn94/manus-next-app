/**
 * Test utility: reads the aggregated router source from the monolith
 * AND all extracted sub-files in server/routers/.
 *
 * This allows tests that do raw string scanning of router implementation
 * to work correctly whether code lives in the monolith or in sub-files.
 */
import fs from "fs";
import path from "path";

let _cache: string | null = null;

export function readRouterSource(): string {
  if (_cache) return _cache;

  const serverDir = path.resolve(__dirname, "..");
  const monolith = path.join(serverDir, "routers.ts");
  const routersDir = path.join(serverDir, "routers");

  let combined = "";

  // Read the main routers.ts (composition root or monolith)
  if (fs.existsSync(monolith)) {
    combined += fs.readFileSync(monolith, "utf-8");
  }

  // Read all sub-files in server/routers/
  if (fs.existsSync(routersDir) && fs.statSync(routersDir).isDirectory()) {
    const files = fs.readdirSync(routersDir).filter(f => f.endsWith(".ts") && !f.endsWith(".test.ts"));
    for (const file of files) {
      combined += "\n" + fs.readFileSync(path.join(routersDir, file), "utf-8");
    }
  }

  _cache = combined;
  return combined;
}

/**
 * Read just the monolith file (for tests that specifically need it).
 */
export function readMonolithSource(): string {
  const monolith = path.resolve(__dirname, "..", "routers.ts");
  return fs.existsSync(monolith) ? fs.readFileSync(monolith, "utf-8") : "";
}

/**
 * Read a specific router sub-file.
 */
export function readRouterSubFile(name: string): string {
  const filePath = path.resolve(__dirname, "..", "routers", `${name}.ts`);
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf-8") : "";
}
