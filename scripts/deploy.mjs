#!/usr/bin/env node
/**
 * Dual-deploy script for Manus Next
 * 
 * Supports:
 * - Manus hosting (current, default)
 * - Cloudflare Pages + Railway (future migration)
 * 
 * Usage:
 *   node scripts/deploy.mjs              # Deploy to current Manus hosting
 *   node scripts/deploy.mjs --cf         # Deploy frontend to Cloudflare Pages
 *   node scripts/deploy.mjs --railway    # Deploy backend to Railway
 *   node scripts/deploy.mjs --all        # Deploy to all targets
 */
import { execSync } from "child_process";

const args = process.argv.slice(2);
const target = args[0] || "--manus";

function run(cmd, label) {
  console.log(`\n▸ ${label}`);
  console.log(`  $ ${cmd}`);
  try {
    execSync(cmd, { stdio: "inherit", cwd: process.cwd() });
    console.log(`  ✓ ${label} complete`);
    return true;
  } catch (e) {
    console.error(`  ✗ ${label} failed: ${e.message}`);
    return false;
  }
}

async function deployManus() {
  console.log("═══ Deploying to Manus Hosting ═══");
  console.log("Manus hosting deploys automatically via checkpoint.");
  console.log("Use the Manus UI Publish button after saving a checkpoint.");
  console.log("Current domain: manusnext-mlromfub.manus.space");
  return true;
}

async function deployCloudflare() {
  console.log("═══ Deploying Frontend to Cloudflare Pages ═══");
  
  // Check wrangler is available
  try {
    execSync("npx wrangler --version", { stdio: "pipe" });
  } catch {
    console.log("Installing wrangler...");
    run("npm install -g wrangler", "Install wrangler");
  }
  
  run("pnpm build", "Build frontend");
  run("npx wrangler pages deploy dist --project-name=manus-next", "Deploy to CF Pages");
  return true;
}

async function deployRailway() {
  console.log("═══ Deploying Backend to Railway ═══");
  
  try {
    execSync("railway --version", { stdio: "pipe" });
  } catch {
    console.error("Railway CLI not installed. Install with: npm install -g @railway/cli");
    console.error("Then run: railway login && railway link");
    return false;
  }
  
  run("railway up", "Deploy to Railway");
  return true;
}

// Execute
console.log("Manus Next Deploy Script v1.0\n");

switch (target) {
  case "--manus":
    await deployManus();
    break;
  case "--cf":
    await deployCloudflare();
    break;
  case "--railway":
    await deployRailway();
    break;
  case "--all":
    await deployManus();
    await deployCloudflare();
    await deployRailway();
    break;
  default:
    console.log("Usage: node scripts/deploy.mjs [--manus|--cf|--railway|--all]");
}
