// Dependency-free Chromium smoke test. Run after npm run build with Node 24+.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const profile = await mkdtemp(join(tmpdir(), 'monomolds-ui-qa-'));
const port = 3104;
const debugPort = 9335;
const base = `http://127.0.0.1:${port}`;
const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], { stdio: 'ignore' });
const chrome = spawn(chromePath, ['--headless=new', '--no-first-run', '--disable-background-networking', `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let ws;
async function ready(url) {
  for (let i = 0; i < 80; i++) {
    try { const response = await fetch(url); if (response.ok) return response; } catch {}
    await delay(250);
  }
  throw new Error(`Timed out: ${url}`);
}
try {
  await ready(`${base}/ui-kit`);
  const targets = await (await ready(`http://127.0.0.1:${debugPort}/json/list`)).json();
  ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }));
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    const callback = pending.get(message.id);
    if (callback) {
      pending.delete(message.id);
      if (message.error) callback.reject(message.error);
      else callback.resolve(message.result);
    }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => { const key = ++id; pending.set(key, { resolve, reject }); ws.send(JSON.stringify({ id: key, method, params })); });
  const evaluate = async expression => {
    const response = await send('Runtime.evaluate', { expression, returnByValue: true });
    if (response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails));
    return response.result.value;
  };
  const until = async expression => { for (let i = 0; i < 80; i++) { if (await evaluate(expression)) return; await delay(100); } throw new Error(`Condition not met: ${expression}`); };
  const click = async text => { await evaluate(`Array.from(document.querySelectorAll('main button')).find(b => b.textContent.trim() === ${JSON.stringify(text)}).click()`); await delay(80); };
  const navigate = async path => { await send('Page.navigate', { url: base + path }); await until("document.readyState === 'complete'"); };
  await send('Page.enable');
  await navigate('/ui-kit');
  await until("!!document.querySelector('#demo-email')");
  await click('Główny przycisk');
  await until("document.querySelector('#przyciski').textContent.includes('Kliknięcia: 1')");
  assert.match(await evaluate("document.querySelector('meta[name=robots]').content"), /noindex/);
  await click('Przetestuj formularz');
  assert.equal(await evaluate("document.activeElement.id"), 'demo-email');
  assert.equal(await evaluate("document.querySelector('#demo-email').getAttribute('aria-invalid')"), 'true');
  assert.equal(await evaluate("document.querySelector('#demo-email').getAttribute('aria-describedby')"), 'demo-email-hint demo-email-error');
  await evaluate("document.querySelector('#demo-email').value='anna@example.com'; document.querySelector('#demo-consent').click(); document.querySelector('#demo-message').value='Test zachowania treści'; document.querySelector('#demo-outcome').value='error'");
  await click('Przetestuj formularz');
  assert.equal(await evaluate("document.querySelector('button[type=submit]').disabled"), true);
  await until("document.querySelector('.ui-demo-result').textContent.includes('Symulowany błąd')");
  assert.equal(await evaluate("document.querySelector('#demo-message').value"), 'Test zachowania treści');
  await evaluate("document.querySelector('#demo-outcome').value='success'");
  await click('Przetestuj formularz');
  await until("document.querySelector('.ui-demo-result').textContent.includes('Test zakończony pomyślnie')");
  await click('Wyczyść');
  assert.equal(await evaluate("document.querySelector('#demo-email').value"), '');
  await click('Puste wyniki');
  assert.equal(await evaluate("document.querySelector('#produkty .ui-empty h2').textContent"), 'Brak wyników');
  await click('Pokaż przykłady');
  assert.equal(await evaluate("document.querySelectorAll('#produkty .ui-skeleton-line').length"), 6);
  await until("document.querySelectorAll('#produkty .ui-product-link').length === 3");
  await click('Błąd katalogu');
  assert.equal(await evaluate("document.querySelector('#produkty [role=alert] .ui-notice-title').textContent"), 'Nie udało się wczytać produktów');
  await click('Spróbuj ponownie');
  await until("document.querySelectorAll('#produkty .ui-product-link').length === 3");
  assert.equal(await evaluate("document.querySelectorAll('#produkty del').length"), 2);
  const widths = [];
  for (const width of [320, 390, 768, 1024, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false });
    await delay(150);
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, `Overflow at ${width}`);
    assert.equal(await evaluate("document.querySelector('.ui-kit-shortcut').getBoundingClientRect().width > 0"), width >= 1024);
    assert.equal(await evaluate("Array.from(document.querySelectorAll('main .ui-button, main .ui-input')).every(e=>e.getBoundingClientRect().height>=44)"), true);
    widths.push(width);
    if (width === 390 || width === 1440) {
      await evaluate("document.activeElement.blur(); window.scrollTo(0,0)");
      const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
      await writeFile(join(profile, `showcase-${width}.png`), Buffer.from(data, 'base64'));
      await evaluate("document.querySelector('#produkty').scrollIntoView()");
      const sectionShot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      await writeFile(join(profile, `products-${width}.png`), Buffer.from(sectionShot.data, 'base64'));
    }
  }
  await evaluate("document.querySelector('#demo-email').focus()");
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  assert.equal(await evaluate('document.activeElement.id'), 'demo-outcome');
  assert.equal(await evaluate('getComputedStyle(document.activeElement).outlineStyle'), 'solid');
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.ui-button')).transitionDuration"), '1e-05s');
  assert.equal(await evaluate('/[\\u2013\\u2014]/.test(document.querySelector("main").innerText)'), false);
  const links = await evaluate("Array.from(document.querySelectorAll('header a,footer a')).map(a=>a.getAttribute('href')).filter(h=>h?.startsWith('/'))");
  for (const path of new Set(links)) assert.equal((await fetch(base + path)).status, 200, path);
  assert.equal((await fetch(base + '/unknown-ui-test-path')).status, 404);
  await navigate('/');
  await until("!!document.querySelector('.home-intro .ui-button')");
  await evaluate("document.querySelector('.home-intro .ui-button').click()");
  await until("location.pathname === '/sklep' && document.querySelector('h1')?.textContent === 'Formy'");
  await evaluate("document.querySelector('.ui-kit-shortcut').click()");
  await until("location.pathname === '/ui-kit' && !!document.querySelector('#demo-email')");
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
  await evaluate("document.querySelector('[aria-label=\"Otwórz menu\"]').click()");
  await until("document.querySelector('dialog').open");
  await evaluate("document.querySelector('dialog a[href=\"/ui-kit\"]').click()");
  await until("!document.querySelector('dialog').open && location.pathname === '/ui-kit'");
  console.log(JSON.stringify({ passed: true, widths, forms: 'validation, loading, error, retry, success, reset', catalogue: 'empty, loading, error, retry, discount, unavailable', navigation: 'all header/footer destinations, 404, homepage CTA', keyboard: 'field order and visible focus', reducedMotion: true, screenshots: profile }, null, 2));
} finally {
  ws?.close();
  server.kill('SIGTERM');
  chrome.kill('SIGTERM');
}
