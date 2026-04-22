import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://localhost:9222');
const contexts = browser.contexts();
let targetPage = null;

for (const ctx of contexts) {
  for (const page of ctx.pages()) {
    if (page.url().includes('84SEDReEoEzZ')) {
      targetPage = page;
      break;
    }
  }
  if (targetPage) break;
}

if (!targetPage) {
  console.log('Page not found');
  process.exit(1);
}

console.log('Found page:', targetPage.url());

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
    for (const btn of buttons) {
      if (btn.textContent.includes('Approve')) {
        btn.scrollIntoView();
        btn.click();
        return 'Clicked via JS eval';
      }
    }
    return 'No Approve button found in DOM';
  });
  console.log(result);
}

await browser.close();
