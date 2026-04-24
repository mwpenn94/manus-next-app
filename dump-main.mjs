import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();
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
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 15000 });
await page.waitForTimeout(3000);

// Dump the main content area
const mainContent = await page.evaluate(() => {
  const main = document.querySelector('main');
  if (!main) return 'No <main> found';
  
  const result = [];
  function walk(el, depth = 0) {
    if (depth > 6) return;
    const tag = el.tagName?.toLowerCase();
    if (!tag) return;
    const text = el.childNodes.length === 1 && el.childNodes[0].nodeType === 3 ? el.textContent?.trim().slice(0, 80) : '';
    const classes = el.className?.toString().slice(0, 80) || '';
    const placeholder = el.getAttribute('placeholder') || '';
    const ariaLabel = el.getAttribute('aria-label') || '';
    const role = el.getAttribute('role') || '';
    const id = el.id || '';
    
    if (tag !== 'svg' && tag !== 'path' && tag !== 'circle' && tag !== 'line' && tag !== 'polyline' && tag !== 'rect') {
      result.push(`${'  '.repeat(depth)}<${tag}${id ? ' id="'+id+'"' : ''}${role ? ' role="'+role+'"' : ''}${ariaLabel ? ' aria="'+ariaLabel+'"' : ''}${placeholder ? ' placeholder="'+placeholder+'"' : ''}${classes ? ' class="'+classes.slice(0,50)+'"' : ''}>${text ? ' "'+text+'"' : ''}`);
      for (const child of el.children) walk(child, depth + 1);
    }
  }
  walk(main);
  return result.join('\n');
});

console.log(mainContent);
await browser.close();
