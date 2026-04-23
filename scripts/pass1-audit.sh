#!/bin/bash
# Pass 1: Automated Infrastructure Audit
# Bundle analysis, dead code, dependency audit, unused exports
set -euo pipefail
cd /home/ubuntu/manus-next-app

echo "=== PASS 1: AUTOMATED INFRASTRUCTURE AUDIT ==="
echo "Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

FINDINGS=0

# ── 1. TypeScript Compilation ──
echo "── 1. TypeScript Compilation ──"
TSC_OUT=$(npx tsc --noEmit 2>&1 || true)
TSC_ERRORS=$(echo "$TSC_OUT" | grep "error TS" | wc -l)
echo "TypeScript errors: $TSC_ERRORS"
if [ "$TSC_ERRORS" -gt 0 ]; then
  echo "$TSC_OUT" | grep "error TS" | head -10
  FINDINGS=$((FINDINGS + TSC_ERRORS))
fi
echo ""

# ── 2. Unused Dependencies ──
echo "── 2. Unused Dependencies Check ──"
# Check package.json deps that aren't imported anywhere
DEPS=$(node -e "const p=require('./package.json'); console.log(Object.keys(p.dependencies||{}).join('\n'))")
UNUSED_DEPS=0
for dep in $DEPS; do
  # Skip framework deps, type packages, and known runtime-only deps
  case "$dep" in
    react|react-dom|vite|tailwindcss|@tailwindcss/*|postcss|autoprefixer|typescript|esbuild|tsx|dotenv|express|mysql2|drizzle-orm|drizzle-kit|@aws-sdk/*|jose|cookie|superjson|@trpc/*|@tanstack/*|streamdown|sonner|class-variance-authority|clsx|tailwind-merge|cmdk|lucide-react|wouter|next-themes|@radix-ui/*|framer-motion|recharts|date-fns|nanoid|zod|stripe|marked)
      continue
      ;;
  esac
  # Search for import of this dep
  FOUND=$(grep -rl "from ['\"]${dep}" --include="*.ts" --include="*.tsx" client/src/ server/ shared/ 2>/dev/null | head -1 || true)
  if [ -z "$FOUND" ]; then
    echo "  UNUSED: $dep"
    UNUSED_DEPS=$((UNUSED_DEPS + 1))
  fi
done
echo "Potentially unused dependencies: $UNUSED_DEPS"
echo ""

# ── 3. Dead Exports (exported but never imported) ──
echo "── 3. Dead Export Check (server/) ──"
DEAD_EXPORTS=0
for f in server/db.ts server/agentTools.ts server/qualityJudge.ts; do
  if [ ! -f "$f" ]; then continue; fi
  EXPORTS=$(grep -oP 'export (?:async )?(?:function|const|type|interface) (\w+)' "$f" | awk '{print $NF}' || true)
  for exp in $EXPORTS; do
    # Search everywhere except the defining file
    IMPORTERS=$(grep -rl "$exp" --include="*.ts" --include="*.tsx" . 2>/dev/null | grep -v "$f" | grep -v node_modules | grep -v ".test." | head -1 || true)
    if [ -z "$IMPORTERS" ]; then
      echo "  DEAD: $exp in $f (exported but never imported)"
      DEAD_EXPORTS=$((DEAD_EXPORTS + 1))
    fi
  done
done
echo "Dead exports found: $DEAD_EXPORTS"
echo ""

# ── 4. Console.log in Production Code ──
echo "── 4. Console.log in Client Code ──"
CLIENT_LOGS=$(grep -rn "console\.\(log\|warn\|error\)" client/src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "// " | grep -v ".test." | wc -l)
echo "Console statements in client code: $CLIENT_LOGS"
if [ "$CLIENT_LOGS" -gt 20 ]; then
  echo "  WARNING: High number of console statements in client code"
  FINDINGS=$((FINDINGS + 1))
fi
echo ""

# ── 5. TODO/FIXME/HACK Comments ──
echo "── 5. TODO/FIXME/HACK Comments ──"
TODOS=$(grep -rn "TODO\|FIXME\|HACK\|XXX" --include="*.ts" --include="*.tsx" client/src/ server/ shared/ 2>/dev/null | grep -v node_modules | grep -v ".test." | wc -l)
echo "TODO/FIXME/HACK comments: $TODOS"
if [ "$TODOS" -gt 0 ]; then
  grep -rn "TODO\|FIXME\|HACK\|XXX" --include="*.ts" --include="*.tsx" client/src/ server/ shared/ 2>/dev/null | grep -v node_modules | grep -v ".test." | head -10
fi
echo ""

# ── 6. Large Files Check ──
echo "── 6. Large Files Check (>500 lines) ──"
LARGE_FILES=0
for f in $(find client/src server shared -name "*.ts" -o -name "*.tsx" 2>/dev/null | grep -v node_modules | grep -v ".test."); do
  LINES=$(wc -l < "$f")
  if [ "$LINES" -gt 500 ]; then
    echo "  LARGE: $f ($LINES lines)"
    LARGE_FILES=$((LARGE_FILES + 1))
  fi
done
echo "Large files: $LARGE_FILES"
echo ""

# ── 7. Duplicate Code Patterns ──
echo "── 7. Duplicate Import Patterns ──"
DUPE_IMPORTS=$(grep -rh "^import.*from" client/src/ --include="*.tsx" 2>/dev/null | sort | uniq -c | sort -rn | head -5)
echo "Most common imports:"
echo "$DUPE_IMPORTS"
echo ""

# ── 8. Security: Hardcoded Secrets ──
echo "── 8. Security: Hardcoded Secrets Check ──"
SECRETS=$(grep -rn "sk-\|sk_live\|sk_test\|password.*=.*['\"]" --include="*.ts" --include="*.tsx" client/src/ server/ shared/ 2>/dev/null | grep -v node_modules | grep -v ".test." | grep -v "placeholder" | grep -v "example" | grep -v "comment" | wc -l)
echo "Potential hardcoded secrets: $SECRETS"
echo ""

# ── 9. Accessibility: Missing Alt Text ──
echo "── 9. Accessibility: Missing Alt Text ──"
MISSING_ALT=$(grep -rn '<img' client/src/ --include="*.tsx" 2>/dev/null | grep -v 'alt=' | wc -l)
echo "Images without alt text: $MISSING_ALT"
echo ""

# ── 10. Test Coverage Summary ──
echo "── 10. Test Coverage Summary ──"
TEST_FILES=$(find server/ -name "*.test.ts" | wc -l)
SOURCE_FILES=$(find server/ -name "*.ts" ! -name "*.test.ts" ! -path "*/node_modules/*" ! -path "*/_core/*" | wc -l)
echo "Test files: $TEST_FILES"
echo "Source files (server/): $SOURCE_FILES"
echo "Test-to-source ratio: $(echo "scale=2; $TEST_FILES / $SOURCE_FILES" | bc)"
echo ""

# ── Summary ──
echo "═══════════════════════════════════════"
echo "PASS 1 SUMMARY"
echo "═══════════════════════════════════════"
echo "TypeScript errors: $TSC_ERRORS"
echo "Unused dependencies: $UNUSED_DEPS"
echo "Dead exports: $DEAD_EXPORTS"
echo "Console statements (client): $CLIENT_LOGS"
echo "TODO/FIXME comments: $TODOS"
echo "Large files (>500 lines): $LARGE_FILES"
echo "Hardcoded secrets: $SECRETS"
echo "Missing alt text: $MISSING_ALT"
echo "Test files: $TEST_FILES / Source files: $SOURCE_FILES"
echo ""
echo "Total findings requiring action: $FINDINGS"
