import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

// First authenticate
await page.goto('http://localhost:3000/', { waitUntil: 'commit', timeout: 15000 });
await page.waitForTimeout(1000);
const loginResponse = await page.request.post('http://localhost:3000/api/test-login', {
  headers: { 'Content-Type': 'application/json' },
});
const body = await loginResponse.json();
console.log('Login:', body.ok, body.openId);

const setCookieHeader = loginResponse.headers()['set-cookie'];
if (setCookieHeader) {
  const cookieStr = setCookieHeader.split(',')[0].trim();
  const parts = cookieStr.split(';').map(p => p.trim());
  const [nameValue] = parts;
  const eqIndex = nameValue.indexOf('=');
  const name = nameValue.substring(0, eqIndex);
  const value = nameValue.substring(eqIndex + 1);
  await context.addCookies([{ name, value, domain: 'localhost', path: '/', httpOnly: true, secure: false, sameSite: 'Lax' }]);
}

// Navigate to home authenticated
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 15000 });
await page.waitForTimeout(3000);

// Dump key elements
const dump = await page.evaluate(() => {
  const results = {};
  
  // Find all text content visible on page
  const allText = [];
  document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, button, a, label, [role]').forEach(el => {
    const text = el.textContent?.trim();
    const tag = el.tagName.toLowerCase();
    const classes = el.className?.toString().slice(0, 100) || '';
    const ariaLabel = el.getAttribute('aria-label') || '';
    const role = el.getAttribute('role') || '';
    const dataTestId = el.getAttribute('data-testid') || '';
    if (text && text.length < 200) {
      allText.push({ tag, text: text.slice(0, 80), classes: classes.slice(0, 60), ariaLabel, role, dataTestId });
    }
  });
  results.textElements = allText.slice(0, 100);
  
  // Find all interactive elements
  const interactive = [];
  document.querySelectorAll('input, textarea, button, select, [role="button"], [role="tab"], [role="link"]').forEach(el => {
    const tag = el.tagName.toLowerCase();
    const type = el.getAttribute('type') || '';
    const placeholder = el.getAttribute('placeholder') || '';
    const ariaLabel = el.getAttribute('aria-label') || '';
    const text = el.textContent?.trim().slice(0, 80) || '';
    const classes = el.className?.toString().slice(0, 80) || '';
    interactive.push({ tag, type, placeholder, ariaLabel, text, classes: classes.slice(0, 60) });
  });
  results.interactive = interactive.slice(0, 80);
  
  // Find main layout structure
  const layout = [];
  document.querySelectorAll('main, aside, nav, header, footer, section, [role="navigation"], [role="main"]').forEach(el => {
    const tag = el.tagName.toLowerCase();
    const classes = el.className?.toString().slice(0, 100) || '';
    const ariaLabel = el.getAttribute('aria-label') || '';
    const role = el.getAttribute('role') || '';
    layout.push({ tag, classes: classes.slice(0, 60), ariaLabel, role });
  });
  results.layout = layout;
  
  return results;
});

console.log('\n=== LAYOUT STRUCTURE ===');
dump.layout.forEach(l => console.log(`  <${l.tag}> class="${l.classes}" aria-label="${l.ariaLabel}" role="${l.role}"`));

console.log('\n=== KEY TEXT ELEMENTS ===');
dump.textElements.forEach(t => console.log(`  <${t.tag}> "${t.text}" class="${t.classes}" aria="${t.ariaLabel}" role="${t.role}" testid="${t.dataTestId}"`));

console.log('\n=== INTERACTIVE ELEMENTS ===');
dump.interactive.forEach(i => console.log(`  <${i.tag}> type="${i.type}" placeholder="${i.placeholder}" aria="${i.ariaLabel}" text="${i.text}" class="${i.classes}"`));

await browser.close();
