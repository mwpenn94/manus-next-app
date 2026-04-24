import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// Auth
await page.goto('http://localhost:3000/', { waitUntil: 'commit', timeout: 10000 });
const lr = await page.request.post('http://localhost:3000/api/test-login', { headers: { 'Content-Type': 'application/json' } });
const sc = lr.headers()['set-cookie'];
if (sc) {
  const nv = sc.split(',')[0].trim().split(';')[0];
  const eq = nv.indexOf('=');
  await page.context().addCookies([{ name: nv.substring(0, eq), value: nv.substring(eq + 1), domain: 'localhost', path: '/', httpOnly: true, secure: false, sameSite: 'Lax' }]);
}

const routes = ['/settings', '/analytics', '/browser', '/github', '/projects', '/memory', '/billing', '/library', '/schedule'];
for (const route of routes) {
  try {
    await page.goto('http://localhost:3000' + route, { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(1500);
    const info = await page.evaluate(() => {
      const main = document.querySelector('main');
      if (!main) return { texts: [], inputs: [], buttons: [], ariaLabels: [] };
      return {
        texts: Array.from(main.querySelectorAll('h1,h2,h3,h4,p')).map(e => e.textContent?.trim().slice(0,60)).filter(Boolean).slice(0,10),
        inputs: Array.from(main.querySelectorAll('input,textarea,select')).map(e => ({ph: e.getAttribute('placeholder')||'', aria: e.getAttribute('aria-label')||'', type: e.getAttribute('type')||''})).slice(0,10),
        buttons: Array.from(main.querySelectorAll('button')).map(e => ({text: e.textContent?.trim().slice(0,40)||'', aria: e.getAttribute('aria-label')||''})).filter(b => b.text || b.aria).slice(0,15),
        ariaLabels: Array.from(main.querySelectorAll('[aria-label]')).map(e => e.getAttribute('aria-label')).slice(0,10)
      };
    });
    console.log(`\n=== ${route} ===`);
    console.log('TEXTS:', JSON.stringify(info.texts));
    console.log('INPUTS:', JSON.stringify(info.inputs));
    console.log('BUTTONS:', JSON.stringify(info.buttons));
    console.log('ARIA:', JSON.stringify(info.ariaLabels));
  } catch(e) { console.log(`\n=== ${route} === ERROR: ${e.message.slice(0,80)}`); }
}

// Task page
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 10000 });
await page.waitForTimeout(1500);
const ta = await page.$('textarea[aria-label="Task input"]');
if (ta) {
  await ta.fill('DOM test task');
  await ta.press('Enter');
  await page.waitForTimeout(4000);
  const info = await page.evaluate(() => {
    const main = document.querySelector('main');
    if (!main) return { texts: [], inputs: [], buttons: [] };
    return {
      texts: Array.from(main.querySelectorAll('h1,h2,h3,h4,p,span')).map(e => e.textContent?.trim().slice(0,60)).filter(Boolean).slice(0,15),
      inputs: Array.from(main.querySelectorAll('input,textarea,select')).map(e => ({ph: e.getAttribute('placeholder')||'', aria: e.getAttribute('aria-label')||''})).slice(0,10),
      buttons: Array.from(main.querySelectorAll('button')).map(e => ({text: e.textContent?.trim().slice(0,40)||'', aria: e.getAttribute('aria-label')||''})).filter(b => b.text || b.aria).slice(0,15),
    };
  });
  console.log(`\n=== TASK PAGE (${page.url()}) ===`);
  console.log('TEXTS:', JSON.stringify(info.texts));
  console.log('INPUTS:', JSON.stringify(info.inputs));
  console.log('BUTTONS:', JSON.stringify(info.buttons));
}

await browser.close();
