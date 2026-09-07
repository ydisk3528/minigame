// Run with: node tests/android-reward.cjs <CommonJS compiler output directory>
const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const fs = require('node:fs');
const root = process.argv[2];
const source = fs.readFileSync(path.join(root, 'platform/GamePlatform.js'), 'utf8');

async function check(mode, bridgeName = 'cocosJava', late = false) {
    let timeout, cleared = 0;
    const previous = () => {};
    const window = {
        onReward: previous, onAdClosed: previous, onAdFailed: previous,
        setTimeout(fn) { timeout = fn; return 1; },
        clearTimeout() { cleared++; },
        cocosJava: {},
    };
    const bridge = window.cocosJava;
    delete window.cocosJava;
    if (!late) window[bridgeName] = bridge;
    if (mode !== 'missing') bridge.showVideo = () => {
        if (mode === 'throw') throw new Error('ad unavailable');
        if (mode === 'timeout') return;
        const callbacks = [window.onReward, window.onAdClosed, window.onAdFailed];
        window[mode]();
        callbacks.forEach(fn => fn()); // Late/duplicate native callbacks must be ignored.
    };
    const context = { exports: {}, window, console: { warn() {} } };
    vm.runInNewContext(source, context);
    if (late) {
        assert.equal(context.exports.GamePlatform.platformName(), 'browser');
        window[bridgeName] = bridge;
    }
    assert.equal(context.exports.GamePlatform.platformName(), 'android');
    const reward = context.exports.GamePlatform.showRewardVideo();
    if (mode === 'timeout') timeout();
    assert.equal(await reward, true, mode);
    assert.equal(window.onReward, previous);
    assert.equal(window.onAdClosed, previous);
    assert.equal(window.onAdFailed, previous);
    assert.equal(cleared, mode === 'missing' ? 0 : 1);
}

(async () => {
    for (const mode of ['missing', 'throw', 'timeout', 'onReward', 'onAdClosed', 'onAdFailed']) await check(mode);
    await check('onAdFailed', 'cocosjava');
    await check('onReward', 'cocosjava', true);
    const browser = { exports: {}, console };
    vm.runInNewContext(source, browser);
    assert.equal(await browser.exports.GamePlatform.showRewardVideo(), true);
    const ui = require(path.resolve(root, 'platform/UiText.js'));
    for (const language of ['', 'id', 'th', 'ja', 'fr', 'en']) {
        ui.setUiLanguage(language);
        for (const key of ['REVIVE SUCCESSFUL', 'REWARD COLLECTED', 'FREE PROP +1', '100 COINS COLLECTED']) {
            assert.ok(ui.uiText(key));
            assert.equal(ui.uiText(key) === key, language === 'en', `${language}: ${key}`);
        }
    }
    console.log('PASS: Android reward fallback, duplicate callbacks, browser behavior and six languages');
})().catch(error => { console.error(error); process.exitCode = 1; });
