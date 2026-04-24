import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

// Auth
await page.goto('http://localhost:3000/', { waitUntil: 'commit', timeout: 15000 });
await page.waitForTimeout(500);
const lr = await page.request.post('http://localhost:3000/api/test-login', { headers: { 'Content-Type': 'application/json' } });
const sc = lr.headers()['set-cookie'];
if (sc) {
  const nv = sc.split(',')[0].trim().split(';')[0];
  const eq = nv.indexOf('=');
  await context.addCookies([{ name: nv.substring(0, eq), value: nv.substring(eq + 1), domain: 'localhost', path: '/', httpOnly: true, secure: false, sameSite: 'Lax' }]);
}

async function dumpPageDeep(url, label) {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000);
  const content = await page.evaluate(() => {
    const main = document.querySelector('main') || document.body;
    const els = main.querySelectorAll('h1, h2, h3, h4, p, span, button, a, input, textarea, select, [role="tab"], [role="tablist"], [role="tabpanel"], [aria-label]');
    return Array.from(els).map(el => {
      const tag = el.tagName.toLowerCase();
      const text = el.textContent?.trim().slice(0, 80) || '';
      const ph = el.getAttribute('placeholder') || '';
      const aria = el.getAttribute('aria-label') || '';
      const role = el.getAttribute('role') || '';
      const href = el.getAttribute('href') || '';
      return `<${tag}${role ? ` role="${role}"` : ''}${aria ? ` aria="${aria}"` : ''}${ph ? ` ph="${ph}"` : ''}${href ? ` href="${href}"` : ''}> "${text}"`;
    }).join('\n');
  });
  console.log(`\n=== ${label} ===`);
  console.log(content);
}

// Task page
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 15000 });
await page.waitForTimeout(2000);
const ta = await page.$('textarea[aria-label="Task input"]');
if (ta) {
  await ta.fill('E2E deep DOM test');
  await ta.press('Enter');
  await page.waitForTimeout(5000);
  await dumpPageDeep(page.url(), 'TASK PAGE');
}

const pages = [
  ['http://localhost:3000/settings', 'SETTINGS'],
  ['http://localhost:3000/analytics', 'ANALYTICS'],
  ['http://localhost:3000/browser', 'BROWSER'],
  ['http://localhost:3000/github', 'GITHUB'],
  ['http://localhost:3000/projects', 'PROJECTS'],
  ['http://localhost:3000/memory', 'MEMORY'],
  ['http://localhost:3000/billing', 'BILLING'],
  ['http://localhost:3000/library', 'LIBRARY'],
  ['http://localhost:3000/schedule', 'SCHEDULE'],
];
for (const [url, label] of pages) {
  await dumpPageDeep(url, label);
}

await browser.close();
