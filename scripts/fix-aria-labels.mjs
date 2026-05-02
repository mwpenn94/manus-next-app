/**
 * Batch fix: Add aria-labels to icon-only buttons
 * Detects Button with size="icon" that lacks aria-label and adds one based on context
 */
import { readFileSync, writeFileSync } from 'fs';

const files = [
  'client/src/pages/BrowserPage.tsx',
  'client/src/pages/ClientInferencePage.tsx',
  'client/src/pages/DesignView.tsx',
  'client/src/pages/DesktopAppPage.tsx',
  'client/src/pages/FigmaImportPage.tsx',
  'client/src/pages/MeetingsPage.tsx',
  'client/src/pages/MessagingAgentPage.tsx',
  'client/src/pages/ReplayPage.tsx',
  'client/src/pages/TeamPage.tsx',
  'client/src/pages/WebAppBuilderPage.tsx',
];

let totalFixes = 0;

for (const file of files) {
  let content = readFileSync(file, 'utf-8');
  let modified = false;
  
  // Pattern: <Button ... size="icon" ... onClick={...}> without aria-label
  // Add aria-label based on the icon inside or the onClick handler
  const regex = /(<Button[^>]*size="icon"[^>]*)(>)/g;
  
  content = content.replace(regex, (match, before, after) => {
    // Skip if already has aria-label
    if (before.includes('aria-label')) return match;
    
    // Try to determine label from context
    let label = 'Action';
    
    // Check for common patterns in the onClick or surrounding content
    if (before.includes('GoBack') || before.includes('goBack') || before.includes('navigate(-1')) label = 'Go back';
    else if (before.includes('GoForward') || before.includes('goForward')) label = 'Go forward';
    else if (before.includes('Reload') || before.includes('reload') || before.includes('Refresh')) label = 'Reload';
    else if (before.includes('navigate("/")') || before.includes("navigate('/')")) label = 'Go home';
    else if (before.includes('close') || before.includes('Close')) label = 'Close';
    else if (before.includes('delete') || before.includes('Delete') || before.includes('Trash')) label = 'Delete';
    else if (before.includes('edit') || before.includes('Edit') || before.includes('Pencil')) label = 'Edit';
    else if (before.includes('copy') || before.includes('Copy')) label = 'Copy';
    else if (before.includes('settings') || before.includes('Settings')) label = 'Settings';
    else if (before.includes('search') || before.includes('Search')) label = 'Search';
    else if (before.includes('add') || before.includes('Add') || before.includes('Plus')) label = 'Add';
    else if (before.includes('menu') || before.includes('Menu')) label = 'Menu';
    else if (before.includes('expand') || before.includes('Expand')) label = 'Expand';
    else if (before.includes('collapse') || before.includes('Collapse')) label = 'Collapse';
    else if (before.includes('replay')) label = 'Go to replay';
    
    modified = true;
    totalFixes++;
    return `${before} aria-label="${label}"${after}`;
  });
  
  if (modified) {
    writeFileSync(file, content);
    console.log(`Fixed: ${file}`);
  }
}

console.log(`\nTotal aria-label fixes: ${totalFixes}`);
