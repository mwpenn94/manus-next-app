import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://localhost:9222');
const contexts = browser.contexts();

// List all pages
for (const ctx of contexts) {
  for (const page of ctx.pages()) {
    console.log('Page URL:', page.url());
  }
}

// Find any page on the manusnext domain
let targetPage = null;
for (const ctx of contexts) {
  for (const page of ctx.pages()) {
    if (page.url().includes('manusnext')) {
      targetPage = page;
      break;
    }
  }
  if (targetPage) break;
}

if (!targetPage) {
  console.log('No manusnext page found, trying first page');
  targetPage = contexts[0]?.pages()[0];
}

if (!targetPage) {
  console.log('No pages at all');
  process.exit(1);
}

console.log('Using page:', targetPage.url());

// Navigate to the task if needed
if (!targetPage.url().includes('84SEDReEoEzZ')) {
  console.log('Navigating to task page...');
  await targetPage.goto('https://manusnext-mlromfub.manus.space/task/84SEDReEoEzZ');
  await targetPage.waitForTimeout(3000);
}

// Try to find the Approve button
const count = await targetPage.locator('button:has-text("Approve")').count();
console.log('Approve buttons found:', count);

if (count > 0) {
  const btn = targetPage.locator('button:has-text("Approve")').first();
  await btn.scrollIntoViewIfNeeded();
  await btn.click();
  console.log('Clicked Approve button!');
} else {
  // Try evaluating JS directly
  console.log('Trying JS evaluation...');
  const result = await targetPage.evaluate(() => {
    const buttons = document.querySelectorAll('button');
    const found = [];
    for (const btn of buttons) {
      if (btn.textContent.includes('Approve')) {
        btn.scrollIntoView();
        btn.click();
        found.push('Clicked: ' + btn.textContent.trim());
      }
    }
    if (found.length === 0) {
      return 'No Approve found. Total buttons: ' + buttons.length;
    }
    return found.join(', ');
  });
  console.log(result);
}

await browser.close();
