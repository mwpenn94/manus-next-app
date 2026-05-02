/**
 * Safe aria-label fixer: Uses line-by-line analysis to avoid breaking JSX
 * Only adds aria-label to lines that:
 * 1. Start a <Button with size="icon"
 * 2. Don't already have aria-label
 * 3. End with > (self-closing or opening)
 * 
 * For multi-line buttons, we look at the closing > line and add aria-label before it
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
  const content = readFileSync(file, 'utf-8');
  const lines = content.split('\n');
  let modified = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Only target single-line Button elements with size="icon" that lack aria-label
    if (line.includes('<Button') && line.includes('size="icon"') && !line.includes('aria-label') && line.includes('>')) {
      // Determine label from context (look at next line for icon name)
      let label = 'Action button';
      const nextLine = lines[i + 1] || '';
      const prevLine = lines[i - 1] || '';
      const context = prevLine + line + nextLine;
      
      if (context.includes('ArrowLeft') || context.includes('GoBack') || context.includes('ChevronLeft')) label = 'Go back';
      else if (context.includes('ArrowRight') || context.includes('GoForward') || context.includes('ChevronRight')) label = 'Go forward';
      else if (context.includes('RefreshCw') || context.includes('RotateCcw') || context.includes('Reload')) label = 'Refresh';
      else if (context.includes('X ') || context.includes('<X/>') || context.includes('X className')) label = 'Close';
      else if (context.includes('Trash') || context.includes('Delete')) label = 'Delete';
      else if (context.includes('Pencil') || context.includes('Edit')) label = 'Edit';
      else if (context.includes('Copy') || context.includes('Clipboard')) label = 'Copy';
      else if (context.includes('Settings') || context.includes('Gear')) label = 'Settings';
      else if (context.includes('Search')) label = 'Search';
      else if (context.includes('Plus') || context.includes('Add')) label = 'Add';
      else if (context.includes('Menu') || context.includes('MoreVertical') || context.includes('MoreHorizontal') || context.includes('Ellipsis')) label = 'More options';
      else if (context.includes('Expand') || context.includes('Maximize')) label = 'Expand';
      else if (context.includes('Minimize') || context.includes('Collapse')) label = 'Collapse';
      else if (context.includes('navigate("/")') || context.includes("navigate('/')")) label = 'Go home';
      else if (context.includes('navigate("/replay")')) label = 'Go to replay';
      else if (context.includes('Play')) label = 'Play';
      else if (context.includes('Pause')) label = 'Pause';
      else if (context.includes('Download')) label = 'Download';
      else if (context.includes('Share')) label = 'Share';
      else if (context.includes('Filter')) label = 'Filter';
      else if (context.includes('Eye')) label = 'Toggle visibility';
      else if (context.includes('Send')) label = 'Send';
      else if (context.includes('Mic')) label = 'Microphone';
      
      // Insert aria-label before the closing >
      // Handle both > and /> endings
      if (line.includes('/>')) {
        lines[i] = line.replace('/>', `aria-label="${label}" />`);
      } else {
        lines[i] = line.replace(/(\s*)(>)(\s*)$/, ` aria-label="${label}"$1$2$3`);
        // Fallback: if the > is not at end of line, try to insert before first >
        if (lines[i] === line) {
          // More careful: find the > that closes the opening tag
          const closeIdx = line.indexOf('>');
          if (closeIdx > 0 && !line.slice(0, closeIdx).includes('aria-label')) {
            lines[i] = line.slice(0, closeIdx) + ` aria-label="${label}"` + line.slice(closeIdx);
          }
        }
      }
      
      if (lines[i] !== line) {
        modified = true;
        totalFixes++;
      }
    }
  }
  
  if (modified) {
    writeFileSync(file, lines.join('\n'));
    console.log(`Fixed: ${file}`);
  }
}

console.log(`\nTotal aria-label fixes: ${totalFixes}`);
