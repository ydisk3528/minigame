import { _decorator, Component, Node, Label, Button, Prefab, instantiate, resources, tween, Tween, Vec3, sp, AudioClip, AudioSource, sys, CCString } from 'cc';
import { BETS, MODES, LANES, PRIZE_LEVELS, Save, RecordEntry, multiplier, payout, startRound, jump, settle, collectBonus } from './ChickenRound';
import { loadSave, storeSave, nativeSaveBridge } from './GameSave';
const { ccclass, property } = _decorator;
@ccclass('ChickenGame')
export class ChickenGame extends Component {
    @property([AudioClip]) sounds: AudioClip[] = [];
    @property([CCString]) soundNames: string[] = [];
    private save!: Save;
    private busy = false;
    private modal: Node | null = null;
    private panels = new Map<string, Node>();
    private loading = false;
    private loadTicket = 0;
    private retry: (() => void) | null = null;
    private autoLeft = 0;
    private autoTarget = 3;
    private autoRounds = 10;
    private autoLoss = 500;
    private autoWin = 1000;
    private autoBalance = 0;
    private elapsed = 0;
    private bgAudio: AudioSource | null = null;
    private n(path: string, root = this.node): Node { const n = root.getChildByPath(path); if (!n) throw new Error('Missing authored Chicken UI: ' + path); return n; }
    private text(path: string, value: string, root = this.node) { this.n(path, root).getComponent(Label)!.string = value; }
    private click(path: string, fn: () => void, root = this.node) { const n = this.n(path, root); n.off(Button.EventType.CLICK); n.on(Button.EventType.CLICK, fn, this); }
    private persist() { storeSave(this.save, sys.localStorage, nativeSaveBridge()); }
    private money(n: number) { return n.toLocaleString('en-US'); }
    start() {
        this.save = loadSave(sys.localStorage, nativeSaveBridge());
        this.click('ButtonLayer/Spin', () => this.begin());
        this.click('ButtonLayer/Jump', () => this.step());
        this.click('ButtonLayer/CashOut', () => this.cashout());
        this.click('ButtonLayer/AutoPlay', () => this.showAuto());
        this.click('ButtonLayer/StopAutoPlay', () => this.stopAuto());
        this.click('ButtonLayer/Bet', () => this.toggleList('BetList'));
        this.click('ButtonLayer/Difficulty', () => this.toggleList('DifficultyList'));
        BETS.forEach(b => this.click('ListLayer/BetList/Layout/Bet' + b, () => { if (this.save.round || this.busy) return; this.save.bet = b; this.closeLists(); this.persist(); this.render(); }));
        ['item', 'item-001', 'item-002'].forEach((name, i) => this.click('ListLayer/DifficultyList/Layout/' + name, () => { if (this.save.round || this.busy) return; this.save.mode = i; this.closeLists(); this.persist(); this.resetRoad(); this.render(); }));
        this.click('ButtonLayer/trubo', () => { this.save.turbo = !this.save.turbo; this.persist(); this.status(this.save.turbo ? 'Turbo speed enabled' : 'Normal speed'); });
        this.click('Help', () => this.showHelp()); this.click('History', () => this.showHistory());
        this.click('Sound', () => { this.save.muted = !this.save.muted; this.persist(); this.render(); this.music(); });
        this.click('Loading/Retry', () => this.retry?.());
        this.click('Loading/Cancel', () => { this.loadTicket++; this.loading = false; this.n('Loading').active = false; this.status('Panel closed. Tap again to retry.'); this.render(); });
        this.resetRoad(); this.render(); this.music();
        if (this.save.round?.pending !== null && this.save.round) this.showBonus();
        else if (this.save.round && this.save.round.stage === LANES[this.save.round.mode]) this.cashout();
        else if (this.save.round) this.status('Saved round restored. Jump or cash out.');
    }
    private music() {
        if (!this.bgAudio) {
            this.bgAudio = this.node.addComponent(AudioSource);
            const i = this.soundNames.findIndex(n => /bgm|music/i.test(n));
            if (i >= 0) { this.bgAudio.clip = this.sounds[i]; this.bgAudio.loop = true; this.bgAudio.volume = .23; }
        }
        if (this.save.muted) this.bgAudio.stop(); else if (this.bgAudio.clip && !this.bgAudio.playing) this.bgAudio.play();
    }
    private sound(fragment: string) { if (this.save.muted) return; const i = this.soundNames.findIndex(n => n.toLowerCase().includes(fragment.toLowerCase())); if (i >= 0) this.getComponent(AudioSource)?.playOneShot(this.sounds[i], .6); }
    private status(value: string) { this.text('Status', value); }
    private closeLists() { this.n('ListLayer/BetList').active = false; this.n('ListLayer/DifficultyList').active = false; }
    private toggleList(name: string) { if (this.busy || this.save.round || this.modal || this.autoLeft) return; const active = this.n('ListLayer/' + name).active; this.closeLists(); this.n('ListLayer/' + name).active = !active; }
    private render() {
        const r = this.save.round, mode = r?.mode ?? this.save.mode, stage = r?.stage ?? 0;
        this.text('GameDataLayer/playercoin_num', this.money(this.save.balance));
        this.text('GameDataLayer/win_num', this.money(r ? payout(r) : (this.save.history[0]?.payout || 0)));
        this.text('TopLayer/stepNode/Label', `${stage}/${LANES[mode]}`);
        this.text('TopLayer/oddsNode/Label', multiplier(mode, stage).toFixed(2) + 'X');
        this.text('ButtonLayer/Bet/Label', this.money(this.save.bet));
        this.text('ButtonLayer/Difficulty/Label', MODES[mode]);
        this.text('ButtonLayer/CashOut/num', this.money(r ? payout(r) : 0));
        this.text('ButtonLayer/StopAutoPlay/Cnt', String(this.autoLeft));
        this.text('Sound/Label', this.save.muted ? 'OFF' : 'ON');
        this.n('ButtonLayer/Spin').active = !r; this.n('ButtonLayer/Jump').active = !!r;
        this.n('ButtonLayer/CashOut').active = !!r && stage > 0;
        this.n('ButtonLayer/AutoPlay').active = !this.autoLeft; this.n('ButtonLayer/StopAutoPlay').active = this.autoLeft > 0;
        for (const name of ['Spin', 'Jump', 'CashOut', 'Bet', 'Difficulty', 'AutoPlay']) {
            const disabled = this.busy || !!this.modal || this.loading || (['Bet', 'Difficulty', 'AutoPlay'].includes(name) && (!!r || this.autoLeft > 0)) || (name === 'CashOut' && r?.pending !== null);
            const b = this.n('ButtonLayer/' + name).getComponent(Button); if (b) b.interactable = !disabled;
        }
        this.text('TopLayer/HistoryStrip', this.save.history.length ? this.save.history.slice(0, 7).map(h => (h.won ? '↑' : '×') + (h.payout / h.bet).toFixed(2) + 'x').join('   ') : 'CHOOSE YOUR PATH · CASH OUT ANY TIME');
    }
    private animate(n: Node, name: string, loop = false) {
        const skeleton = n.getComponent(sp.Skeleton); if (!skeleton) return;
        try { if (skeleton.findAnimation(name)) { skeleton.timeScale = this.save.turbo ? 2 : 1; skeleton.setAnimation(0, name, loop); } } catch (e) { console.warn('Spine animation unavailable', name, e); }
    }
    private resetRoad() {
        const r = this.save.round, mode = r?.mode ?? this.save.mode, stage = r?.stage ?? 0;
        Tween.stopAllByTarget(this.n('BGLayer')); this.n('BGLayer').setPosition(-480 - Math.max(0, stage - 1) * 199, 0);
        this.n('Character').setPosition(stage ? 3.5 : -199, 60); this.animate(this.n('Character'), 'Idle', true);
        for (let i = 1; i <= 28; i++) {
            const lane = this.n('BGLayer/Lane' + i); lane.active = i <= LANES[mode];
            this.text('odds_num', multiplier(mode, i).toFixed(2) + 'x', lane);
            for (let c = 1; c <= 5; c++) this.n('coin_0' + c, lane).active = i > stage && c === Math.min(5, 1 + Math.floor((i - 1) / 6));
            this.n('odds_num', lane).active = i > stage; this.n('foot', lane).active = i <= stage;
            this.n('Roadblock', lane).active = i === stage; if (i === stage) this.animate(this.n('Roadblock', lane), 'Stop');
            this.n('oddsTag/bag', lane).active = i % 7 === 0 && i > stage;
            const car = this.n('Cars', lane); car.setPosition(0, 700 + (i * 337) % 1500);
            car.getComponent(sp.Skeleton)?.setSkin(['Car_01-1', 'Car_01-2', 'Car_02-1', 'Car_03'][(i - 1) % 4]);
            this.animate(car, 'Track1_Smoke123', true);
        }
        this.n('BGLayer/bg_end').setPosition(483.5 + 199 * LANES[mode], 0);
    }
    update(dt: number) {
        if (!this.save) return;
        this.elapsed += dt;
        if (this.busy || this.modal || this.loading) return;
        const stage = this.save.round?.stage ?? 0;
        for (let i = Math.max(1, stage); i <= Math.min(28, stage + 4); i++) {
            const lane = this.n('BGLayer/Lane' + i); if (!lane.active || i <= stage) continue;
            const car = this.n('Cars', lane); let y = car.position.y - dt * (this.save.turbo ? 1000 : 550);
            if (y < -1100) y = 1500 + i * 77 % 600; car.setPosition(0, y);
        }
    }
    private begin() {
        if (this.busy || this.modal || this.loading || this.save.round) return;
        if (!startRound(this.save)) { this.stopAuto(); this.status('Not enough balance. Choose a smaller bet.'); if (this.save.balance < 10) this.showRefill(); return; }
        this.closeLists(); this.persist(); this.resetRoad(); this.render(); this.step();
    }
    private step() {
        if (this.busy || this.modal || this.loading || !this.save.round) return;
        if (this.save.round.pending !== null) { this.showBonus(); return; }
        const next = this.save.round.stage + 1, mode = this.save.round.mode;
        const outcome = jump(this.save); if (outcome === 'blocked') return;
        // Save the outcome before animation so reloading cannot retry a collision or bonus draw.
        this.persist(); this.busy = true; this.render(); this.closeLists();
        const duration = this.save.turbo ? .22 : .6;
        this.animate(this.n('Character'), 'Start1'); this.sound('Chicken_Move');
        tween(this.n('Character')).to(duration, { position: new Vec3(3.5, 60, 0) }).start();
        tween(this.n('BGLayer')).to(duration, { position: new Vec3(-480 - Math.max(0, next - 1) * 199, 0, 0) }).call(() => {
            if (outcome === 'lost') {
                const car = this.n('BGLayer/Lane' + next + '/Cars'); car.setPosition(0, 850);
                tween(car).to(.2, { position: new Vec3(0, 60, 0) }).call(() => { this.animate(this.n('Character'), 'Hit1'); this.sound('Chicken_Fail'); }).to(.35, { position: new Vec3(0, -1000, 0) }).start();
                this.status('Collision! The round has ended.');
                this.scheduleOnce(() => { this.busy = false; this.finish(this.save.history[0]); }, this.save.turbo ? .8 : 1.4);
            } else {
                this.busy = false; this.resetRoad(); this.render(); this.sound('Chicken_Pass');
                this.status(`Lane ${next} cleared · ${multiplier(mode, next).toFixed(2)}x`);
                if (outcome === 'bonus') this.showBonus();
                else if (next === LANES[mode]) this.cashout();
                else this.queueAuto();
            }
        }).start();
    }
    private cashout() {
        if (this.busy || this.modal || this.loading) return;
        const record = settle(this.save, true); if (!record) return;
        this.persist(); this.animate(this.n('Character'), 'Win1'); this.sound('Cash'); this.finish(record);
    }
    private finish(record: RecordEntry) {
        this.render();
        this.open('ChickenResult', panel => {
            this.text('Title', record.won ? 'CASH OUT!' : 'ROUND OVER', panel);
            this.text('Amount', record.won ? '+' + this.money(record.payout) : (record.payout ? 'BONUS +' + this.money(record.payout) : 'TRY AGAIN'), panel);
            this.text('Detail', `${MODES[record.mode]} · ${record.stage} lanes\nBet ${this.money(record.bet)} · ${record.won ? (record.payout / record.bet).toFixed(2) + 'x returned' : 'The chicken was hit'}`, panel);
            // The collision already played on the road; keep a visible chicken on the result card.
            this.animate(this.n('Chicken', panel), record.won ? 'Win1' : 'Idle2', !record.won);
            this.n('StopAuto', panel).active = this.autoLeft > 0;
            this.click('StopAuto', () => { this.stopAuto(); this.n('StopAuto', panel).active = false; }, panel);
            let consumed = false;
            const next = () => {
                if (consumed) return; consumed = true; this.closePanel(); this.resetRoad();
                if (this.autoLeft) {
                    this.autoLeft--;
                    const delta = this.save.balance - this.autoBalance;
                    if (delta <= -this.autoLoss || delta >= this.autoWin || !this.autoLeft || this.save.balance < this.save.bet) this.stopAuto();
                    else this.scheduleOnce(() => { if (this.autoLeft && !this.modal) this.begin(); }, .4);
                }
                this.render();
            };
            this.click('Continue', next, panel);
            if (this.autoLeft) this.scheduleOnce(() => { if (this.modal === panel && this.autoLeft) next(); }, this.save.turbo ? .8 : 1.7);
        });
    }
    private queueAuto() {
        if (!this.autoLeft) return;
        this.scheduleOnce(() => { if (!this.autoLeft || this.modal || this.busy || !this.save.round) return; if (this.save.round.stage >= this.autoTarget) this.cashout(); else this.step(); }, this.save.turbo ? .18 : .7);
    }
    private stopAuto() { this.autoLeft = 0; this.status('Auto play stopped'); this.render(); }
    private open(name: string, ready: (panel: Node) => void) {
        if (this.modal || this.loading) return;
        this.closeLists();
        const show = (panel: Node) => { this.modal = panel; panel.active = true; panel.setSiblingIndex(this.node.children.length - 1); ready(panel); this.render(); };
        const cached = this.panels.get(name); if (cached) { show(cached); return; }
        const ticket = ++this.loadTicket; this.loading = true; this.n('Loading').active = true; this.n('Loading').setSiblingIndex(this.node.children.length - 1);
        this.n('Loading/Retry').active = false; this.text('Loading/Label', 'LOADING  0%'); this.render();
        this.retry = () => { this.loading = false; this.open(name, ready); };
        resources.load('deferred/' + name, Prefab, (done, total) => { if (this.isValid && ticket === this.loadTicket) this.text('Loading/Label', `LOADING  ${Math.floor(done / Math.max(1, total) * 100)}%`); }, (err, asset) => {
            if (!this.isValid || ticket !== this.loadTicket) return;
            if (err) { console.error(err); this.text('Loading/Label', 'Load failed. Please retry.'); this.n('Loading/Retry').active = true; return; }
            this.loading = false; this.n('Loading').active = false;
            const panel = instantiate(asset); this.node.addChild(panel); this.panels.set(name, panel); show(panel);
        });
    }
    private closePanel() { if (this.modal) this.modal.active = false; this.modal = null; this.render(); this.queueAuto(); }
    private showHelp() {
        if (this.busy || this.autoLeft) return;
        this.open('ChickenDialog', p => {
            this.text('Title', 'HOW TO PLAY', p);
            this.text('Body', '1. Select your bet and difficulty.\n\n2. START crosses the first lane. Tap JUMP to continue. Each successful crossing increases the multiplier.\n\n3. CASH OUT to collect. A collision ends the round and loses the stake.\n\nBags may award a bonus wheel. Bonus winnings are retained even after a collision.\n\nAuto play stops at your chosen lane and balance limits.\n\nLocal recreation with virtual credits and a local probability table.', p);
            this.click('Close', () => this.closePanel(), p);
        });
    }
    private showHistory() {
        if (this.busy || this.autoLeft) return;
        this.open('ChickenDialog', p => {
            this.text('Title', 'ROUND HISTORY', p);
            this.text('Body', this.save.history.length ? this.save.history.slice(0, 12).map(h => `${h.won ? 'WIN' : 'HIT'} · ${MODES[h.mode]} · ${h.stage} lanes\nBet ${h.bet}   Return ${this.money(h.payout)}`).join('\n\n') : 'Your completed rounds will appear here.', p);
            this.click('Close', () => this.closePanel(), p);
        });
    }
    private showRefill() {
        this.open('ChickenDialog', p => {
            this.text('Title', 'VIRTUAL CREDITS', p); this.text('Body', 'Your local play balance is too low.\n\nPress REFILL to receive 10,000 virtual credits and keep playing.\n\nThese credits have no monetary value.', p); this.text('Close/Label', 'REFILL', p);
            this.click('Close', () => { if (!this.save.round && this.save.balance < 10) { this.save.balance += 10000; this.persist(); } this.text('Close/Label', 'CLOSE', p); this.closePanel(); }, p);
        });
    }
    private showAuto() {
        if (this.save.round || this.busy) return;
        this.open('ChickenAuto', p => {
            const custom = 'ChickenDashAutoSetting/';
            const update = () => {
                this.text(custom + 'MineCnt/Cnt/Label', MODES[this.save.mode], p); this.text(custom + 'TargetStage/Cnt/Label', String(this.autoTarget), p);
                this.text('Rounds', String(this.autoRounds), p); this.text('StopLoss', this.money(this.autoLoss), p); this.text('StopWin', this.money(this.autoWin), p);
            };
            for (const [part, dir] of [['Add', 1], ['Sub', -1]] as const) {
                this.click(custom + 'MineCnt/Cnt/' + part, () => { this.save.mode = (this.save.mode + dir + 3) % 3; this.autoTarget = Math.min(this.autoTarget, LANES[this.save.mode]); this.persist(); update(); }, p);
                this.click(custom + 'TargetStage/Cnt/' + part, () => { this.autoTarget = Math.max(1, Math.min(LANES[this.save.mode], this.autoTarget + dir)); update(); }, p);
            }
            for (const [part, dir] of [['Up', 1], ['Down', -1]] as const) {
                this.click('Rounds' + part, () => { this.autoRounds = Math.max(1, Math.min(100, this.autoRounds + dir * 5)); update(); }, p);
                this.click('StopLoss' + part, () => { this.autoLoss = Math.max(this.save.bet, Math.min(100000, this.autoLoss + dir * 100)); update(); }, p);
                this.click('StopWin' + part, () => { this.autoWin = Math.max(this.save.bet, Math.min(100000, this.autoWin + dir * 100)); update(); }, p);
            }
            this.click('Close', () => { this.closePanel(); this.resetRoad(); }, p);
            this.click('Start', () => { this.autoLeft = this.autoRounds; this.autoBalance = this.save.balance; this.closePanel(); this.begin(); }, p); update();
        });
    }
    private showBonus() {
        if (!this.save.round || this.save.round.pending === null) return;
        const prize = this.save.round.pending;
        const level = this.save.round.mode, prizes = PRIZE_LEVELS[level];
        this.open('ChickenBonus', p => {
            const wheel = this.n('Wheel', p); wheel.angle = 0;
            this.text('Title', `BONUS WHEEL · LV ${level + 1}`, p);
            prizes.forEach((value, i) => this.text('Wheel/Prize' + i, value + 'x', p));
            this.text('Amount', 'Spin to reveal your bag reward!', p); this.text('Spin/Label', 'SPIN', p);
            let spinning = false, collected = false;
            this.click('Spin', () => {
                if (spinning) return;
                if (collected) { this.closePanel(); this.resetRoad(); if (this.save.round && this.save.round.stage === LANES[this.save.round.mode]) this.cashout(); return; }
                spinning = true; this.n('Spin', p).getComponent(Button)!.interactable = false;
                this.sound('roulette_start');
                tween(wheel).to(this.save.turbo ? 2 : 4, { angle: 360 * 6 + prize * 36 }, { easing: 'quartOut' }).call(() => {
                    const amount = collectBonus(this.save); this.persist(); spinning = false; collected = true;
                    this.text('Amount', `${prizes[prize]}x BONUS\n+${this.money(amount)}`, p); this.text('Spin/Label', 'COLLECT', p);
                    this.n('Spin', p).getComponent(Button)!.interactable = true; this.render();
                    if (this.autoLeft) this.scheduleOnce(() => { if (this.modal === p) { this.closePanel(); this.resetRoad(); if (this.save.round && this.save.round.stage === LANES[this.save.round.mode]) this.cashout(); } }, 1.2);
                }).start();
            }, p);
            this.n('Spin', p).getComponent(Button)!.interactable = true;
            if (this.autoLeft) this.scheduleOnce(() => { if (this.modal === p) this.n('Spin', p).emit(Button.EventType.CLICK); }, .4);
        });
    }
    onDestroy() { this.loadTicket++; this.unscheduleAllCallbacks(); for (const n of this.node.children) Tween.stopAllByTarget(n); this.bgAudio?.stop(); }
}
