/**
 * Clone and Build — Server-side helper for building GitHub repos
 * 
 * Clones a GitHub repo, runs install + build commands, and returns
 * the path to the built output directory.
 */
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export interface CloneAndBuildOptions {
  /** GitHub clone URL (https) */
  cloneUrl: string;
  /** Branch to checkout */
  branch: string;
  /** GitHub access token for private repos */
  token?: string;
  /** Install command (default: "npm install") */
  installCommand?: string;
  /** Build command (default: "npm run build") */
  buildCommand?: string;
  /** Expected output directory name (default: "dist") */
  outputDir?: string;
  /** Node version to use (default: system default) */
  nodeVersion?: string;
  /** Environment variables to inject during build */
  envVars?: Record<string, string>;
  /** Timeout for build in ms (default: 120000) */
  buildTimeout?: number;
  /** Log callback for streaming build progress */
  onLog?: (line: string) => void;
}

export interface CloneAndBuildResult {
  success: boolean;
  /** Absolute path to the built output directory */
  outputPath?: string;
  /** Build log lines */
  buildLog: string[];
  /** Error message if failed */
  error?: string;
  /** Build duration in seconds */
  durationSec: number;
  /** Whether a package.json was found (i.e., this is a buildable project) */
  hasBuildStep: boolean;
}

/** Whitelist of allowed install/build command prefixes to prevent command injection */
const ALLOWED_COMMAND_PREFIXES = [
  "npm install", "npm ci", "npm run",
  "yarn install", "yarn",
  "pnpm install", "pnpm run",
  "npx", "bun install", "bun run",
];

function sanitizeBuildCommand(cmd: string): string {
  const trimmed = cmd.trim();
  // Block shell metacharacters that enable injection
  if (/[;&|`$(){}\\]/.test(trimmed)) {
    throw new Error(`Unsafe command rejected: contains shell metacharacters`);
  }
  // Must start with an allowed prefix
  const isAllowed = ALLOWED_COMMAND_PREFIXES.some(prefix => trimmed.startsWith(prefix));
  if (!isAllowed) {
    throw new Error(`Unsafe command rejected: must start with one of: ${ALLOWED_COMMAND_PREFIXES.join(", ")}`);
  }
  return trimmed;
}

/**
 * Clone a GitHub repo, install dependencies, run build, and return the output path.
 * If no package.json is found, returns the repo root as a static site.
 */
export async function cloneAndBuild(options: CloneAndBuildOptions): Promise<CloneAndBuildResult> {
  const {
    cloneUrl,
    branch,
    token,
    installCommand: rawInstallCommand = "npm install",
    buildCommand: rawBuildCommand = "npm run build",
    outputDir = "dist",
    envVars = {},
    buildTimeout = 120000,
    onLog,
  } = options;

  // Sanitize commands to prevent injection
  const installCommand = sanitizeBuildCommand(rawInstallCommand);
  const buildCommand = sanitizeBuildCommand(rawBuildCommand);

  const startTime = Date.now();
  const buildLog: string[] = [];
  const log = (line: string) => {
    buildLog.push(`[${new Date().toISOString()}] ${line}`);
    onLog?.(line);
  };

  // Create a temporary directory for the clone
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "manus-build-"));
  
  try {
    // Clone the repo
    log(`Cloning ${cloneUrl} (branch: ${branch})...`);
    const authUrl = token
      ? cloneUrl.replace("https://", `https://x-access-token:${token}@`)
      : cloneUrl;
    
    try {
      execSync(
        `git clone --depth 1 --branch ${branch} "${authUrl}" "${tmpDir}/repo" 2>&1`,
        { timeout: 60000 }
      );
    } catch (cloneErr: any) {
      const errMsg = cloneErr.stdout?.toString() || cloneErr.stderr?.toString() || cloneErr.message || "";
      log(`Clone failed: ${errMsg.slice(0, 500)}`);
      return {
        success: false,
        buildLog,
        error: `Failed to clone repository: ${errMsg.slice(0, 500)}`,
        durationSec: Math.round((Date.now() - startTime) / 1000),
        hasBuildStep: false,
      };
    }

    const repoDir = path.join(tmpDir, "repo");
    log("Clone complete");

    // Check if this is a buildable project (has package.json)
    const hasPackageJson = fs.existsSync(path.join(repoDir, "package.json"));
    
    if (!hasPackageJson) {
      // Static site — no build step needed
      log("No package.json found — treating as static site");
      return {
        success: true,
        outputPath: repoDir,
        buildLog,
        durationSec: Math.round((Date.now() - startTime) / 1000),
        hasBuildStep: false,
      };
    }

    log(`Found package.json — running build pipeline`);

    // Build environment variables
    const buildEnv = {
      ...process.env,
      ...envVars,
      NODE_ENV: "production",
      CI: "true",
    };

    // Install dependencies
    log(`Running: ${installCommand}`);
    try {
      const installOutput = execSync(
        `cd "${repoDir}" && ${installCommand} 2>&1`,
        { timeout: buildTimeout, env: buildEnv }
      ).toString();
      const installLines = installOutput.split("\n").filter((l: string) => l.trim()).slice(-5);
      installLines.forEach((l: string) => log(`  ${l}`));
      log("Dependencies installed");
    } catch (installErr: any) {
      const errMsg = installErr.stdout?.toString() || installErr.stderr?.toString() || installErr.message || "";
      log(`Install failed: ${errMsg.slice(0, 1000)}`);
      return {
        success: false,
        buildLog,
        error: `Install failed: ${errMsg.slice(0, 1000)}`,
        durationSec: Math.round((Date.now() - startTime) / 1000),
        hasBuildStep: true,
      };
    }

    // Run build command
    log(`Running: ${buildCommand}`);
    try {
      const buildOutput = execSync(
        `cd "${repoDir}" && ${buildCommand} 2>&1`,
        { timeout: buildTimeout, env: buildEnv }
      ).toString();
      const buildLines = buildOutput.split("\n").filter((l: string) => l.trim()).slice(-10);
      buildLines.forEach((l: string) => log(`  ${l}`));
      log("Build complete");
    } catch (buildErr: any) {
      const errMsg = buildErr.stdout?.toString() || buildErr.stderr?.toString() || buildErr.message || "";
      // Extract structured errors
      const lines = errMsg.split("\n");
      const errorLines = lines
        .filter((l: string) => /error|Error|TS\d{4}|SyntaxError|Cannot find|Module not found/i.test(l))
        .slice(0, 15);
      const structuredErrors = errorLines.length > 0 ? errorLines.join("\n") : errMsg.slice(-2000);
      log(`Build failed with ${errorLines.length} error(s):\n${structuredErrors}`);
      return {
        success: false,
        buildLog,
        error: `Build failed:\n${structuredErrors}`,
        durationSec: Math.round((Date.now() - startTime) / 1000),
        hasBuildStep: true,
      };
    }

    // Find the output directory
    const possibleDirs = [outputDir, "dist", "build", "out", ".next/out", "public"];
    let actualOutputDir: string | null = null;
    
    for (const dir of possibleDirs) {
      const fullPath = path.join(repoDir, dir);
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
        // Check if it has an index.html
        if (fs.existsSync(path.join(fullPath, "index.html"))) {
          actualOutputDir = fullPath;
          break;
        }
      }
    }

    // Fallback: check if index.html is in repo root
    if (!actualOutputDir && fs.existsSync(path.join(repoDir, "index.html"))) {
      actualOutputDir = repoDir;
    }

    if (!actualOutputDir) {
      log(`No output directory with index.html found. Checked: ${possibleDirs.join(", ")}`);
      return {
        success: false,
        buildLog,
        error: `Build completed but no index.html found in ${possibleDirs.join(", ")} or repo root`,
        durationSec: Math.round((Date.now() - startTime) / 1000),
        hasBuildStep: true,
      };
    }

    log(`Output directory: ${path.relative(repoDir, actualOutputDir) || "root"}`);
    
    return {
      success: true,
      outputPath: actualOutputDir,
      buildLog,
      durationSec: Math.round((Date.now() - startTime) / 1000),
      hasBuildStep: true,
    };
  } catch (err: any) {
    return {
      success: false,
      buildLog,
      error: `Unexpected error: ${err.message}`,
      durationSec: Math.round((Date.now() - startTime) / 1000),
      hasBuildStep: false,
    };
  }
}

/**
 * Clean up the temporary build directory.
 * Call this after you've uploaded the build output.
 */
export function cleanupBuildDir(outputPath: string): void {
  try {
    // Walk up to find the tmpdir root (contains "manus-build-")
    let dir = outputPath;
    while (dir !== "/" && !path.basename(dir).startsWith("manus-build-")) {
      dir = path.dirname(dir);
    }
    if (dir !== "/") {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  } catch {
    // Best-effort cleanup
  }
}
