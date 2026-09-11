// Run with: node tests/ads-disabled.cjs <compiled GameSave.js>
const assert = require("node:assert/strict");
const path = require("node:path");
const { GameSave } = require(path.resolve(process.argv[2]));

let calls = 0;
global.window = {
    cocosJava: {
        showBanner() { calls++; },
        hideBanner() { calls++; },
        showVideo() { calls++; },
    },
    setTimeout() { throw new Error("Disabled ads must not wait for callbacks"); },
};

(async () => {
    assert.equal(GameSave.adsEnabled, false);
    GameSave.showBanner();
    GameSave.hideBanner();
    assert.equal(await GameSave.showRewardVideo(), true);
    assert.equal(calls, 0);
    assert.equal(window.onReward, undefined);
    delete window.cocosJava;
    assert.equal(await GameSave.showRewardVideo(), true);
    console.log("Ads disabled: no native ad calls; rewards work with and without a bridge.");
})().catch((error) => { console.error(error); process.exitCode = 1; });
