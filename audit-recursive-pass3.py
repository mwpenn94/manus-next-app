"""
Recursive Optimization Pass 3 — Code-Level Static Analysis & Edge Cases
Fresh angle: checks for common React anti-patterns, CSS issues, and edge cases.
"""
import os, re, glob

PROJECT = "/home/ubuntu/manus-next-app"
PAGES_DIR = f"{PROJECT}/client/src/pages"
COMPONENTS_DIR = f"{PROJECT}/client/src/components"

issues = []

def check_file(filepath, checks):
    """Run a list of checks against a file."""
    try:
        with open(filepath, 'r') as f:
            content = f.read()
    except:
        return
    
    filename = os.path.basename(filepath)
    for check_name, pattern, severity in checks:
        if isinstance(pattern, str):
            if pattern in content:
                issues.append((severity, filename, check_name))
        elif callable(pattern):
            result = pattern(content)
            if result:
                issues.append((severity, filename, f"{check_name}: {result}"))


# ── Check 1: React anti-patterns ──
print("=== Check 1: React Anti-Patterns ===")

react_checks = [
    ("setState in render (no useEffect)", lambda c: "setState" in c and "useEffect" not in c and "useState" in c, "HIGH"),
    ("Direct DOM manipulation", "document.getElementById", "MEDIUM"),
    ("Inline style objects in render", lambda c: bool(re.search(r'style=\{\{[^}]+\}\}', c)) and c.count('style={{') > 5, "LOW"),
]

for filepath in glob.glob(f"{PAGES_DIR}/*.tsx"):
    check_file(filepath, react_checks)

for filepath in glob.glob(f"{COMPONENTS_DIR}/*.tsx"):
    check_file(filepath, react_checks)


# ── Check 2: CSS/Tailwind issues ──
print("=== Check 2: CSS/Tailwind Issues ===")

css_checks = [
    ("Fixed pixel widths on containers", lambda c: bool(re.search(r'w-\[\d{4,}px\]', c)), "MEDIUM"),
    ("Hardcoded colors instead of theme tokens", lambda c: c.count('#') > 20 and 'oklch' not in c[:500], "LOW"),
]

for filepath in glob.glob(f"{PAGES_DIR}/*.tsx"):
    check_file(filepath, css_checks)


# ── Check 3: Missing error boundaries ──
print("=== Check 3: Error Handling ===")

# Check App.tsx for ErrorBoundary usage
app_tsx = f"{PROJECT}/client/src/App.tsx"
with open(app_tsx, 'r') as f:
    app_content = f.read()

if "ErrorBoundary" not in app_content:
    issues.append(("HIGH", "App.tsx", "No ErrorBoundary wrapping routes"))
else:
    print("  ✓ ErrorBoundary found in App.tsx")

# Check for try-catch in mutation handlers
for filepath in glob.glob(f"{PAGES_DIR}/*.tsx"):
    with open(filepath, 'r') as f:
        content = f.read()
    filename = os.path.basename(filepath)
    if "useMutation" in content and "onError" not in content and "catch" not in content:
        issues.append(("MEDIUM", filename, "Mutations without error handling"))


# ── Check 4: Mobile-specific checks ──
print("=== Check 4: Mobile-Specific ===")

# Verify pb-mobile-nav is on all scrollable pages
scrollable_pages = [
    "Home.tsx", "Library.tsx", "BillingPage.tsx", "SettingsPage.tsx",
    "AnalyticsPage.tsx", "DiscoverPage.tsx", "GitHubPage.tsx",
    "ProfilePage.tsx", "MemoryPage.tsx", "SchedulePage.tsx",
    "ProjectsPage.tsx", "TeamPage.tsx", "ConnectorsPage.tsx",
    "SkillsPage.tsx", "MeetingsPage.tsx", "ReplayPage.tsx",
]

for page in scrollable_pages:
    filepath = f"{PAGES_DIR}/{page}"
    if os.path.exists(filepath):
        with open(filepath, 'r') as f:
            content = f.read()
        if "pb-mobile-nav" not in content:
            issues.append(("HIGH", page, "Missing pb-mobile-nav class"))
        else:
            pass  # OK


# ── Check 5: Workspace constrained fix ──
print("=== Check 5: TaskView Width Fix ===")

taskview = f"{PAGES_DIR}/TaskView.tsx"
with open(taskview, 'r') as f:
    tv_content = f.read()

if "data-workspace-constrained" in tv_content:
    print("  ✓ data-workspace-constrained attribute present")
else:
    issues.append(("HIGH", "TaskView.tsx", "Missing data-workspace-constrained fix"))

if "@media (max-width: 767px)" in tv_content and "[data-workspace-constrained]" in tv_content:
    print("  ✓ Mobile CSS override for workspace constraint present")
else:
    issues.append(("HIGH", "TaskView.tsx", "Missing mobile CSS override for workspace constraint"))


# ── Check 6: PlusMenu completeness ──
print("=== Check 6: PlusMenu ===")

plusmenu = f"{COMPONENTS_DIR}/PlusMenu.tsx"
with open(plusmenu, 'r') as f:
    pm_content = f.read()

required_items = ['"new-task"', '"github-repos"', '"hands-free"']
for item in required_items:
    if item in pm_content:
        print(f"  ✓ PlusMenu has {item}")
    else:
        issues.append(("HIGH", "PlusMenu.tsx", f"Missing menu item {item}"))

if "createPortal" in pm_content:
    print("  ✓ PlusMenu uses portal rendering")
else:
    issues.append(("MEDIUM", "PlusMenu.tsx", "Not using portal rendering"))


# ── Check 7: Index.css theme consistency ──
print("=== Check 7: Theme Consistency ===")

index_css = f"{PROJECT}/client/src/index.css"
with open(index_css, 'r') as f:
    css_content = f.read()

if ".dark" in css_content or ":root" in css_content:
    print("  ✓ Theme variables defined in index.css")
else:
    issues.append(("HIGH", "index.css", "No theme variables found"))

if ".pb-mobile-nav" in css_content:
    print("  ✓ pb-mobile-nav utility defined")
else:
    issues.append(("HIGH", "index.css", "pb-mobile-nav utility missing"))


# ── Check 8: Import health ──
print("=== Check 8: Import Health ===")

for filepath in glob.glob(f"{PAGES_DIR}/*.tsx"):
    with open(filepath, 'r') as f:
        content = f.read()
    filename = os.path.basename(filepath)
    
    # Check for unused imports (basic heuristic)
    import_lines = [l for l in content.split('\n') if l.startswith('import ')]
    for imp in import_lines:
        # Extract imported names
        match = re.search(r'import\s+\{([^}]+)\}', imp)
        if match:
            names = [n.strip().split(' as ')[-1].strip() for n in match.group(1).split(',')]
            for name in names:
                if name and len(name) > 2:
                    # Count occurrences after the import section
                    body = content[content.index(imp) + len(imp):]
                    if body.count(name) == 0:
                        issues.append(("LOW", filename, f"Possibly unused import: {name}"))


# ── Summary ──
print("\n" + "="*60)
print(f"PASS 3 SUMMARY: {len(issues)} issues found")
print("="*60)

if issues:
    for severity, filename, description in sorted(issues, key=lambda x: {"HIGH": 0, "MEDIUM": 1, "LOW": 2}[x[0]]):
        print(f"  [{severity}] {filename}: {description}")
else:
    print("  ✓ NO ISSUES FOUND — CONVERGENCE CONFIRMED")
