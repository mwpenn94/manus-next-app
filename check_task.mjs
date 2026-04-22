import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://localhost:9222');
const contexts = browser.contexts();

// List all pages
for (const ctx of contexts) {
  for (const page of ctx.pages()) {
    console.log('Page URL:', page.url());
  }
}

// Try to find any page and navigate
let targetPage = null;
for (const ctx of contexts) {
  for (const page of ctx.pages()) {
    targetPage = page;
    break;
  }
  if (targetPage) break;
}

if (!targetPage) {
  // Create a new page
  console.log('No pages found, creating new one');
  const ctx = contexts[0] || await browser.newContext();
  targetPage = await ctx.newPage();
}

console.log('Using page:', targetPage.url());

// Navigate to the task
await targetPage.goto('https://manusnext-mlromfub.manus.space/task/84SEDReEoEzZ', { waitUntil: 'networkidle', timeout: 30000 });
await targetPage.waitForTimeout(5000);

// Get the page content
const content = await targetPage.evaluate(() => {
  // Check for step progress
  const stepElements = document.querySelectorAll('button');
  let stepInfo = '';
  for (const el of stepElements) {
    const text = el.textContent.trim();
    if (text.includes('of') && text.includes('step')) {
      stepInfo = text;
    }
    if (text.includes('Task Progress')) {
      stepInfo = text;
    }
  }
  
  // Check for Approve buttons
  let approveFound = false;
  for (const btn of document.querySelectorAll('button')) {
    if (btn.textContent.includes('Approve')) {
      approveFound = true;
    }
  }
  
  // Check task status
  const statusEl = document.querySelector('[class*="Running"], [class*="Complete"], [class*="Done"]');
  
  return {
    stepInfo,
    approveFound,
    title: document.title,
    bodyText: document.body.innerText.substring(0, 500)
  };
});

console.log('Step info:', content.stepInfo);
console.log('Approve found:', content.approveFound);
console.log('Title:', content.title);
console.log('Body preview:', content.bodyText.substring(0, 300));

// Take a screenshot
await targetPage.screenshot({ path: '/home/ubuntu/task_status.png', fullPage: false });
console.log('Screenshot saved to /home/ubuntu/task_status.png');

await browser.close();
