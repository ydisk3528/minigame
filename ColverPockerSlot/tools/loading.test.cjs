// Browser regression against the actual web build. NODE_PATH may point to bundled Playwright.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
const url = process.env.CLOVER_TEST_URL || 'http://127.0.0.1:8771/';
const out = 'tools/test-output';

async function state(page) {
  return page.evaluate(async () => {
    const cc = await System.import('cc');
    const canvas = cc.director.getScene()?.getChildByName('Canvas');
    const loading = canvas?.getComponent('CloverLoading');
    const app = canvas?.getChildByName('CloverMain')?.getComponent('CloverApp');
    const names = []; cc.assetManager.assets.forEach(a => names.push(a.name));
    return { loading: loading?.active, percent: loading?.caption?.string, retry: loading?.retry?.active,
      app: !!app, dialog: !!app?.dialogRoot, dialogOpen: !!app?.dialogRoot?.active,
      bonus: !!app?.bonusRoot, bonusOpen: !!app?.bonusRoot?.active,
      busy: app?.busy, cardBusy: app?.cardBusy, balance: app?.balance,
      spinReady: !!app?.linePrefab, bigWin: !!app?.gameRoot?.getChildByName('Node_BigWin'), names };
  });
}
async function until(page, predicate, timeout = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try { const s = await state(page); if (predicate(s)) return s; } catch {}
    await page.waitForTimeout(100);
  }
  throw new Error('Timed out; ' + JSON.stringify(await state(page)));
}
async function click(page, root, name) {
  const point = await page.evaluate(async ({ root, name }) => {
    const cc = await System.import('cc');
    const app = cc.director.getScene().getChildByName('Canvas').getChildByName('CloverMain').getComponent('CloverApp');
    const find = n => n.name === name ? n : n.children.map(find).find(Boolean);
    const n = find(app[root]); if (!n?.activeInHierarchy) throw new Error('Button not visible: ' + name);
    const p = n.worldPosition; return { x: p.x, y: 640 - p.y };
  }, { root, name });
  await page.mouse.click(point.x, point.y);
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
    args: ['--autoplay-policy=no-user-gesture-required'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1136, height: 640 } });
    const errors = [], requests = [], logs = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.text().includes('[Clover]')) logs.push(m.text()); if (m.type() === 'error' && !m.text().includes('404')) errors.push(m.text()); });
    page.on('request', r => requests.push(r.url()));
    let release; const gate = new Promise(resolve => release = resolve);
    await page.route('**/assets/clover/**', async route => { await gate; await route.continue(); });
    await page.goto(url + '?qa=cards', { waitUntil: 'domcontentloaded' });
    await until(page, s => s.loading && !s.app);
    await page.screenshot({ path: out + '/loading-startup.png' });
    release();
    const first = await until(page, s => s.app && !s.loading);
    assert.equal(first.dialog, false); assert.equal(first.bonus, false); assert.equal(first.spinReady, false); assert.equal(first.bigWin, false);
    for (const name of ['CloverDialog', 'CloverBonus', 'BG_Declare', 'BG_Compliment', 'Bigwin', 'GameIntro', 'BGM_MG', 'BGM_BG']) assert(!first.names.includes(name), 'Startup loaded ' + name);
    await page.screenshot({ path: out + '/loading-main.png' });
    const initialRequests = requests.length;
    await click(page, 'gameRoot', 'Settings');
    await until(page, s => s.dialogOpen && !s.loading);
    await page.screenshot({ path: out + '/loading-rules.png' });
    await click(page, 'dialogRoot', 'Paytable');
    const title = await page.evaluate(async () => {
      const cc = await System.import('cc');
      return cc.director.getScene().getChildByName('Canvas').getChildByName('CloverMain').getComponent('CloverApp').dialogRoot.getChildByName('Title').getComponent(cc.Label).string;
    });
    assert.equal(title, 'PAYTABLE');
    await click(page, 'dialogRoot', 'Close');
    const beforeReopen = requests.length;
    await click(page, 'gameRoot', 'Settings');
    await until(page, s => s.dialogOpen && !s.loading);
    assert.equal(requests.length, beforeReopen, 'Cached settings fetched new resources');
    await click(page, 'dialogRoot', 'Feature');
    await until(page, s => s.bonusOpen && !s.loading);
    await page.screenshot({ path: out + '/loading-bonus.png' });
    for (const i of [0, 1, 2, 3, 7, 11]) {
      await click(page, 'bonusRoot', 'Card' + i);
      await until(page, s => !s.cardBusy);
    }
    await click(page, 'bonusRoot', 'Collect');
    await until(page, s => !s.bonusOpen && !s.busy);
    assert.equal((await state(page)).spinReady, false, 'Bonus path eagerly loaded spin effects');

    // Controlled failure on first SPIN: retain the balance until a retry has loaded everything.
    await page.unroute('**/assets/clover/**');
    let failing = true;
    await page.route('**/assets/clover/**', route => failing ? route.abort('failed') : route.continue());
    const beforeSpin = (await state(page)).balance;
    await click(page, 'gameRoot', 'Spin');
    await until(page, s => s.retry, 45000);
    assert.equal((await state(page)).balance, beforeSpin, 'Balance deducted before loading succeeded');
    await page.screenshot({ path: out + '/loading-retry.png' });
    failing = false;
    await page.mouse.click(568, 435);
    await until(page, s => !s.loading && s.spinReady, 45000);
    await until(page, s => !s.busy || s.bonusOpen, 45000);
    // Expected transport errors belong to the deliberately failed request phase.
    const unexpected = errors.filter(e => !/net::ERR_FAILED|load failed; retry available|load audio failure|Download.*failed|download.*failed|Failed to load resource/i.test(e));
    assert.deepEqual(unexpected, []);
    fs.writeFileSync(out + '/loading-browser-report.json', JSON.stringify({ initialRequests, settingsRequests: beforeReopen - initialRequests,
      startupAssets: first.names, final: await state(page), requests, errors, logs }, null, 2));

    // Forced wild result covers first-use expand/line/fly and BigWin resources.
    const wild = await browser.newPage({ viewport: { width: 1136, height: 640 } });
    const wildErrors = []; wild.on('pageerror', e => wildErrors.push(e.message));
    await wild.goto(url + '?qa=wild'); await until(wild, s => s.app && !s.loading);
    await click(wild, 'gameRoot', 'Spin');
    await until(wild, s => s.bigWin && !s.loading && !s.busy, 60000);
    assert.deepEqual(wildErrors, []);
    await wild.screenshot({ path: out + '/loading-wild-complete.png' });
    console.log('PASS: black startup, no unopened assets, rules/paytable/cache, bonus+collect, failed SPIN+retry without early debit, wild+BigWin.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
