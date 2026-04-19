#!/usr/bin/env node
/**
 * Removes inter-package @mwpenn94/* dependencies from package stubs
 * since they're not published to npm yet. Keeps external deps only.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const PKGS_DIR = join(process.cwd(), 'packages');
const pkgs = ['agent', 'bridge', 'chat', 'core', 'design', 'memory', 'projects', 'replay', 'scheduler', 'share', 'storage', 'tools', 'voice'];

for (const pkg of pkgs) {
  const pkgPath = join(PKGS_DIR, pkg, 'package.json');
  try {
    const json = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    if (json.dependencies) {
      const cleaned = {};
      for (const [k, v] of Object.entries(json.dependencies)) {
        if (!k.startsWith('@mwpenn94/')) {
          cleaned[k] = v;
        }
      }
      json.dependencies = Object.keys(cleaned).length > 0 ? cleaned : undefined;
      if (!json.dependencies) delete json.dependencies;
    }
    writeFileSync(pkgPath, JSON.stringify(json, null, 2) + '\n');
    console.log(`Fixed ${pkg}/package.json`);
  } catch (e) {
    console.error(`Error fixing ${pkg}: ${e.message}`);
  }
}
console.log('Done');
