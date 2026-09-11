// Run: tsc --target es2020 --module commonjs --lib es2020,dom --outDir <temp>; node tests/settings-language.cjs <temp>
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const compiled = path.resolve(process.argv[2]);
const ui = require(path.join(compiled, 'platform/UiText.js'));
const { MahjongSave: save } = require(path.join(compiled, 'game/MahjongSave.js'));
const assets = path.join(__dirname, '../assets/resources/prefabs/ui');
class Node {
    constructor(data) { Object.assign(this, data); this.children = (data._$child || []).map(makeNode); }
    getChildByName(name) { return this.children.find(child => child.name === name); }
    getChildAt(index) { return this.children[index]; }
    get numChildren() { return this.children.length; }
    destroy() { this.destroyed = true; }
}
class Text extends Node {}
function makeNode(data) { return new (data._$type === 'GTextField' ? Text : Node)(data); }
global.Laya = { GTextField: Text };
let panel, choose, homeRefreshes = 0;
save.data = save.normalize({ language: 'en' });
save.write = () => {};
const context = {
    exports: {}, Laya: { GTextField: Text, loader: { load: async () => {} }, Loader: {},
        Prefab: { instantiate: async () => panel = makeNode(JSON.parse(fs.readFileSync(path.join(assets, 'SettingsPanel.lh'), 'utf8'))) } },
    require(name) {
        if (name.endsWith('/UiText')) return ui;
        if (name.endsWith('/MahjongSave')) return { MahjongSave: save };
        if (name.endsWith('/GamePlatform')) return { GamePlatform: { platformName: () => 'browser' } };
        return {};
    },
    captureChoose: callback => { choose = callback; },
    refreshHome: () => { homeRefreshes++; },
};
const source = fs.readFileSync(path.join(compiled, 'Main.js'), 'utf8').split('/** The bootstrap scene')[0];
vm.runInNewContext(source + `
    bindPress = (button, action) => { button.press = action; };
    requireSound = () => ({ play() {} });
    applyAudioSettings = () => {};
    contentRoot = () => ({ addChild() {} });
    showLanguagePicker = async (scene, selected, callback) => captureChoose(callback);
    showHome = async () => refreshHome();
    exports.openSettings = showSettings;
`, context);
(async () => {
    ui.setUiLanguage('en');
    await context.exports.openSettings({});
    panel.getChildByName('LanguageButton').press();
    for (const language of ['my', 'th', 'fr', 'en', 'my']) {
        choose(language);
        assert.equal(panel.getChildByName('TitleText').text, ui.uiText('SETTINGS', language));
        assert.equal(panel.getChildByName('LanguageTitle').text, ui.uiText('LANGUAGE', language));
        assert.equal(panel.getChildByName('LanguageNote').text, ui.uiText('TAP TO CHOOSE, THEN CONFIRM', language));
        for (const [button, key] of [['MusicButton', 'MUSIC: ON'], ['SoundButton', 'SOUND: ON'], ['PrivacyButton', 'PRIVACY & TERMS'], ['ConfirmButton', 'CONFIRM']])
            assert.equal(panel.getChildByName(button).getChildByName('Label').text, ui.uiText(key, language));
        assert.equal(ui.uiLanguage(), 'en', 'preview must not commit');
        assert.equal(save.language(), 'en');
    }
    panel.getChildByName('MusicButton').press();
    assert.equal(panel.getChildByName('MusicButton').getChildByName('Label').text, ui.uiText('MUSIC: OFF', 'my'));
    panel.getChildByName('ConfirmButton').press();
    assert.equal(save.language(), 'my');
    assert.equal(ui.uiLanguage(), 'my');
    assert.equal(save.normalize(JSON.parse(JSON.stringify(save.data))).language, 'my');
    assert.equal(homeRefreshes, 1);
    assert.ok(panel.destroyed);
    await context.exports.openSettings({});
    assert.equal(panel.getChildByName('TitleText').text, 'ဆက်တင်များ');
    const picker = JSON.parse(fs.readFileSync(path.join(assets, 'LanguagePickerPanel.lh'), 'utf8'));
    const buttons = picker._$child.filter(node => node.name.endsWith('Button')).sort((a, b) => a.y - b.y);
    assert.ok(buttons.some(node => node.name === 'BurmeseButton'));
    buttons.slice(1).forEach((button, index) => assert.ok(button.y >= buttons[index].y + buttons[index].height));
    for (const key of ['LEVEL 3', 'COINS 2', 'D3', 'DAY 3 OF 7', 'DAY 3 COMPLETE', '100 LEVELS · SWIPE TO SCROLL'])
        assert.match(ui.uiText(key), /[\u1000-\u109f]/);
    ui.uiTextSelfCheck();
    console.log('PASS: Settings preview, repeated switching, audio toggle, confirm, saved language and picker layout');
})().catch(error => { console.error(error); process.exitCode = 1; });
