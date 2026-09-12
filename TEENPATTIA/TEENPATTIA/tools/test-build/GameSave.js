"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadSave = loadSave;
exports.storeSave = storeSave;
exports.nativeSaveBridge = nativeSaveBridge;
const key = 'teenpatti.local.v1';
function freshSave() {
    return { game: 'teenpatti', version: 1, balance: 10000, muted: false, name: 'Player', avatar: 0, rounds: 0, wins: 0, history: [] };
}
function parse(raw) {
    try {
        let v = JSON.parse(raw || 'null');
        if (typeof v === 'string')
            v = JSON.parse(v);
        if (v?.game !== 'teenpatti' || v.version !== 1 || !Number.isSafeInteger(v.balance) || v.balance < 0)
            return null;
        return { ...freshSave(), balance: v.balance, muted: !!v.muted, name: typeof v.name === 'string' ? v.name.slice(0, 14) : 'Player', avatar: Number.isInteger(v.avatar) ? Math.abs(v.avatar) % 8 : 0, rounds: Number.isSafeInteger(v.rounds) ? Math.max(0, v.rounds) : 0, wins: Number.isSafeInteger(v.wins) ? Math.max(0, v.wins) : 0, history: Array.isArray(v.history) ? v.history.filter((s) => typeof s === 'string').slice(0, 12) : [] };
    }
    catch {
        return null;
    }
}
function loadSave(storage, bridge) {
    let saved = null;
    try {
        saved = parse(bridge?.getGameSave() || null);
    }
    catch (e) {
        console.warn('Native save read failed', e);
    }
    if (!saved)
        try {
            saved = parse(storage.getItem(key));
        }
        catch (e) {
            console.warn('Browser save read failed', e);
        }
    return saved || freshSave();
}
function storeSave(save, storage, bridge) {
    const json = JSON.stringify(save);
    try {
        storage.setItem(key, json);
    }
    catch (e) {
        console.warn('Browser save failed', e);
    }
    try {
        bridge?.setGameSave(json);
    }
    catch (e) {
        console.warn('Native save write failed', e);
    }
}
function nativeSaveBridge() { return window.cocosJava; }
