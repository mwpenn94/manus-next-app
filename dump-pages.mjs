import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

// Auth
await page.goto('http://localhost:3000/', { waitUntil: 'commit', timeout: 15000 });
await page.waitForTimeout(1000);
const loginResponse = await page.request.post('http://localhost:3000/api/test-login', { headers: { 'Content-Type': 'application/json' } });
const setCookieHeader = loginResponse.headers()['set-cookie'];
if (setCookieHeader) {
  const cookieStr = setCookieHeader.split(',')[0].trim();
  const [nameValue] = cookieStr.split(';').map(p => p.trim());
  const eqIndex = nameValue.indexOf('=');
  await context.addCookies([{ name: nameValue.substring(0, eqIndex), value: nameValue.substring(eqIndex + 1), domain: 'localhost', path: '/', httpOnly: true, secure: false, sameSite: 'Lax' }]);
}

async function dumpPage(url, label) {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000);
  const content = await page.evaluate(() => {
    const main = document.querySelector('main') || document.body;
    const result = [];
    function walk(el, depth = 0) {
      if (depth > 4) return;
      const tag = el.tagName?.toLowerCase();
      if (!tag || ['svg','path','circle','line','polyline','rect','defs','g','stop','linearGradient'].includes(tag)) return;
      const text = el.childNodes.length === 1 && el.childNodes[0].nodeType === 3 ? el.textContent?.trim().slice(0, 60) : '';
      const placeholder = el.getAttribute('placeholder') || '';
      const ariaLabel = el.getAttribute('aria-label') || '';
      const role = el.getAttribute('role') || '';
      result.push(`${'  '.repeat(depth)}<${tag}${role ? ' role="'+role+'"' : ''}${ariaLabel ? ' aria="'+ariaLabel+'"' : ''}${placeholder ? ' ph="'+placeholder+'"' : ''}>${text ? ' "'+text+'"' : ''}`);
      for (const child of el.children) walk(child, depth + 1);
    }
    walk(main);
    return result.join('\n');
  });
  console.log(`\n=== ${label} ===`);
  console.log(content);
}

// Create a task to get task page
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 15000 });
await page.waitForTimeout(2000);
const textarea = await page.$('textarea[aria-label="Task input"]');
if (textarea) {
  await textarea.fill('E2E DOM inspection task');
  await textarea.press('Enter');
  await page.waitForTimeout(5000);
  console.log('\n=== TASK PAGE URL ===');
  console.log(page.url());
  const taskContent = await page.evaluate(() => {
    const main = document.querySelector('main') || document.body;
    const result = [];
    function walk(el, depth = 0) {
      if (depth > 4) return;
      const tag = el.tagName?.toLowerCase();
      if (!tag || ['svg','path','circle','line','polyline','rect','defs','g','stop','linearGradient'].includes(tag)) return;
      const text = el.childNodes.length === 1 && el.childNodes[0].nodeType === 3 ? el.textContent?.trim().slice(0, 60) : '';
      const placeholder = el.getAttribute('placeholder') || '';
      const ariaLabel = el.getAttribute('aria-label') || '';
      const role = el.getAttribute('role') || '';
      result.push(`${'  '.repeat(depth)}<${tag}${role ? ' role="'+role+'"' : ''}${ariaLabel ? ' aria="'+ariaLabel+'"' : ''}${placeholder ? ' ph="'+placeholder+'"' : ''}>${text ? ' "'+text+'"' : ''}`);
      for (const child of el.children) walk(child, depth + 1);
    }
    walk(main);
    return result.join('\n');
  });
  console.log('\n=== TASK PAGE DOM ===');
  console.log(taskContent);
}

await dumpPage('http://localhost:3000/settings', 'SETTINGS');
await dumpPage('http://localhost:3000/analytics', 'ANALYTICS');
await dumpPage('http://localhost:3000/browser', 'BROWSER');
await dumpPage('http://localhost:3000/github', 'GITHUB');
await dumpPage('http://localhost:3000/projects', 'PROJECTS');
await dumpPage('http://localhost:3000/memory', 'MEMORY');
await dumpPage('http://localhost:3000/billing', 'BILLING');
await dumpPage('http://localhost:3000/library', 'LIBRARY');
await dumpPage('http://localhost:3000/schedule', 'SCHEDULE');

await browser.close();
