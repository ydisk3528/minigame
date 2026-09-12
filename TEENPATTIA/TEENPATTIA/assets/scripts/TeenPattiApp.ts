import { _decorator, Component, Node, SpriteFrame, Sprite, Label, Button, Animation, AudioClip, AudioSource, UIOpacity, ProgressBar, tween, view, ResolutionPolicy, sys, sp, profiler, CCString, Prefab, resources, instantiate, isValid } from 'cc';
import { Round, rank, HANDS, shuffle, Action } from './TeenPattiRules';
import { DeferredAssets } from './DeferredAssets';
import { GameSave, loadSave, storeSave, nativeSaveBridge } from './GameSave';
const { ccclass, property } = _decorator;
const BOOTS = [1, 5, 10, 30, 100];
const NAMES = ['Arjun', 'Maya', 'Rohan', 'Priya', 'Vikram', 'Aisha', 'Kabir', 'Ananya'];
@ccclass('TeenPattiApp')
export class TeenPattiApp extends Component {
    @property(Node) loadingOverlay: Node = null!;
    private loading = false;
    private retryLoad: (() => Promise<void>) | null = null;
    @property(Node) lobbyRoot: Node = null!;
    @property(Node) tableRoot: Node = null!;
    @property(Node) dialogRoot: Node = null!;
    @property(Node) winnerRoot: Node = null!;
    @property(Node) loseRoot: Node = null!;
    @property(Node) quickSettingRoot: Node = null!;
    @property([SpriteFrame]) faces: SpriteFrame[] = [];
    @property([SpriteFrame]) portraits: SpriteFrame[] = [];
    @property([AudioClip]) sounds: AudioClip[] = [];
    @property([CCString]) soundNames: string[] = [];
    private lobby: Node = null!; private table: Node = null!; private dialog: Node = null!;
    private audio: AudioSource = null!; private music: AudioSource = null!;
    private round: Round | null = null; private room = 0; private clock = 15; private aiDelay = 0;
    private busy = false; private pendingTime = 0; private settled = false;
    private names: string[] = []; private images: number[] = []; private startBalance = 0;
    private save: GameSave = { game: 'teenpatti', version: 1, balance: 10000, muted: false, name: 'Player', avatar: 0, rounds: 0, wins: 0, history: [] };
    private onClose: (() => void) | null = null;
    private confirmAction: (() => void) | null = null;
    private at(root: Node, path: string): Node { let n = root; for (const p of path.split('/')) n = n.getChildByName(p)!; return n; }
    private find(root: Node, name: string): Node | null { if (root.name === name) return root; for (const c of root.children) { const n = this.find(c, name); if (n) return n; } return null; }
    private text(root: Node, path: string, value: string) { this.at(root, path).getComponent(Label)!.string = value; }
    private bind(root: Node, path: string, fn: () => void) { this.at(root, path).on(Button.EventType.CLICK, () => { this.sound('Button_Slide'); fn(); }, this); }
    private sound(name: string) { const clip = this.sounds[this.soundNames.indexOf(name)]; if (clip && !this.save.muted) this.audio.playOneShot(clip, .65); }
    private play(n: Node | null, clip: string) {
        if (!n) return; const a = n.getComponent(Animation);
        const imported = a?.clips.find(c => c && (c.name === clip || c.name.startsWith(clip + '_')));
        if (a && imported) { for (let p: Node | null = n; p && p !== this.table.parent; p = p.parent) p.active = true; a.play(imported.name); }
    }
    private money(n: number) { return n.toLocaleString('en-US'); }
    private load() { this.save = loadSave(sys.localStorage, nativeSaveBridge()); }
    private persist() { storeSave(this.save, sys.localStorage, nativeSaveBridge()); }
    private async fetchPanel(name: string): Promise<Node> {
        const prefab = await new Promise<Prefab>((resolve, reject) => resources.load(`deferred/${name}`, Prefab, (done, total) => {
            if (isValid(this.node)) this.text(this.loadingOverlay, 'LoadingLabel', `Loading… ${total ? Math.min(99, Math.floor(done / total * 100)) : 0}%`);
        }, (error, asset) => error ? reject(error) : resolve(asset)));
        if (!isValid(this.node)) throw new Error('Scene closed during loading');
        const panel = instantiate(prefab); panel.active = false; this.node.addChild(panel);
        panel.setSiblingIndex(this.quickSettingRoot.getSiblingIndex());
        return panel;
    }
    private async runLoading(task: () => Promise<void>) {
        if (this.loading) return;
        this.loading = true; this.retryLoad = null; this.loadingOverlay.active = true;
        this.at(this.loadingOverlay, 'Spinner').active = true;
        this.at(this.loadingOverlay, 'Retry').active = this.at(this.loadingOverlay, 'Back').active = false;
        this.text(this.loadingOverlay, 'LoadingLabel', 'Loading… 0%');
        try { await task(); if (isValid(this.node)) this.loadingOverlay.active = false; }
        catch (error) {
            if (!isValid(this.node)) return;
            console.warn('TeenPatti deferred load failed', error); this.retryLoad = task;
            this.at(this.loadingOverlay, 'Spinner').active = false;
            this.at(this.loadingOverlay, 'Retry').active = true;
            this.at(this.loadingOverlay, 'Back').active = !!this.lobby || !!this.table;
            this.text(this.loadingOverlay, 'LoadingLabel', 'Unable to load. Please retry.');
        } finally { this.loading = false; }
    }
    start() {
        this.quickSettingRoot ||= this.node.getChildByName('TeenPattiQuickSetting')!;
        this.loadingOverlay ||= this.node.getChildByName('Loading')!;
        profiler.hideStats(); view.setDesignResolutionSize(1136, 640, ResolutionPolicy.SHOW_ALL);
        this.load(); this.audio = this.node.addComponent(AudioSource); this.music = this.node.addComponent(AudioSource);
        this.music.loop = true; this.music.volume = .25;
        this.dialog = this.dialogRoot; this.dialog.active = false; this.loadingOverlay.active = false;
        this.dialog.setSiblingIndex(this.loadingOverlay.getSiblingIndex() - 1);
        this.bind(this.loadingOverlay, 'Retry', () => { if (this.retryLoad) void this.runLoading(this.retryLoad); });
        this.bind(this.loadingOverlay, 'Back', () => { this.retryLoad = null; this.loadingOverlay.active = false; if (!this.round && this.lobby) { this.quickSettingRoot.active = false; this.showLobby(); } });
        this.bind(this.quickSettingRoot, 'Button1', () => { void this.runLoading(async () => { await this.ensureLobby(); this.quickSettingRoot.active = false; this.showLobby(); }); });
        this.bind(this.quickSettingRoot, 'Button2', () => { void this.runLoading(async () => {
            if (this.save.balance < BOOTS[this.room] * 512) { await this.ensureLobby(); this.quickSettingRoot.active = false; this.showLobby(); this.message('ROOM BALANCE', 'Choose a lower room to continue.'); return; }
            await this.ensureTable(); this.quickSettingRoot.active = false; this.table.active = true; this.begin();
        }); });
        this.bind(this.dialog, 'Close', () => { this.dialog.active = false; const fn = this.onClose; this.onClose = null; fn?.(); });
        this.bind(this.dialog, 'Accept', () => { if (this.confirmAction) { const fn = this.confirmAction; this.confirmAction = null; this.dialog.active = false; fn(); } else this.answer(true); });
        this.bind(this.dialog, 'Reject', () => this.answer(false));
        this.quickSettingRoot.active = false;
        void this.runLoading(async () => { await this.ensureLobby(); this.showLobby(); });
    }
    private showQuickSetting() {
        [BOOTS[this.room], 4, BOOTS[this.room] * 256, BOOTS[this.room] * 1024].forEach((value, i) => this.text(this.quickSettingRoot, `Layout${i + 1}/num`, this.money(value)));
        this.quickSettingRoot.active = true;
    }
    private async ensureLobby() {
        if (this.lobby) return;
        this.lobby = this.lobbyRoot = await this.fetchPanel('TeenPattiLobby');
        this.portraits = this.lobby.getComponent(DeferredAssets)!.portraits;
        for (let i = 0; i < 5; i++) {
            const root = `Room/btn_0${i + 1}/RoomCard/${i === 0 ? '01' : '02'}`;
            this.bind(this.lobby, root, () => this.enter(i)); this.bind(this.lobby, root + '/joinBtn', () => this.enter(i));
        }
        this.bind(this.lobby, 'Help', () => this.help()); this.bind(this.lobby, 'Sound', () => this.toggleSound());
        for (const skeleton of this.lobby.getComponentsInChildren(sp.Skeleton)) {
            const names = Object.keys((skeleton.skeletonData as any)?.skeletonJson?.animations || {});
            if (names.length) skeleton.setAnimation(0, names[0], true);
        }
        this.refreshLobby();
    }
    private async ensureTable() {
        if (this.table) return;
        this.table = this.tableRoot = await this.fetchPanel('TeenPattiTable');
        const data = this.table.getComponent(DeferredAssets)!;
        this.faces = data.faces; this.portraits = data.portraits; this.sounds = data.sounds; this.soundNames = data.soundNames;
        this.music.clip = this.sounds[this.soundNames.indexOf('BGMusic')]; this.toggleMusic();
        this.bind(this.table, 'Help', () => this.help()); this.bind(this.table, 'Sound', () => this.toggleSound());
        this.bind(this.table, 'Home', () => this.home());
        for (const [idx, action] of [[1, 'pack'], [2, 'show'], [3, 'call'], [4, 'raise']] as [number, Action][]) this.bind(this.table, `Btn/Btn_0${idx}`, () => this.action(action));
        this.bind(this.table, 'Btn/Btn_00', () => { if (!this.round || this.busy || this.dialog.active) return; this.round.see(2); this.sound('SendCard'); this.play(this.at(this.table, 'Poker/03/Poker'), 'Clip_Poker_Fan'); this.render(); });
        this.bind(this.table, 'Btn/Btn_05', () => this.begin());
    }
    private showLobby() { if (this.table) this.table.active = false; this.lobby.active = true; this.refreshLobby(); }
    private async ensureResult(win: boolean) {
        if (win ? this.winnerRoot : this.loseRoot) return;
        const panel = await this.fetchPanel(win ? 'TeenPattiWinner' : 'TeenPattiLose');
        if (win) this.winnerRoot = panel; else this.loseRoot = panel;
        this.bind(panel, 'Content/Close', () => { panel.active = false; });
        this.bind(panel, 'Content/Continue', () => { panel.active = false; this.begin(); });
        this.bind(panel, 'Content/Lobby', () => { this.home(); });
    }
    private toggleMusic() { if (this.save.muted) this.music.stop(); else if (this.music.clip && !this.music.playing) this.music.play(); }
    private toggleSound() { this.save.muted = !this.save.muted; this.persist(); this.toggleMusic(); this.refreshLobby(); }
    private refreshLobby() {
        if (this.lobby) { this.text(this.lobby, 'LobbyBar/Data/Layout/Num_Gold', this.money(this.save.balance));
        this.text(this.lobby, 'LobbyBar/Data/TXT_Name', this.save.name);
        this.at(this.lobby, 'LobbyBar/Data/Photo/Img').getComponent(Sprite)!.spriteFrame = this.portraits[this.save.avatar]; }
        for (const n of [this.lobby, this.table]) if (n) this.text(n, 'Sound/Label', this.save.muted ? 'MUTED' : 'SOUND');
    }
    private enter(room: number) {
        if (!this.lobby.active || this.dialog.active) return;
        if (this.save.balance < BOOTS[room] * 512) { this.message('MINIMUM ENTRY', `This room requires ${this.money(BOOTS[room] * 512)} coins.\nYour balance: ${this.money(this.save.balance)}\nChoose a lower room.\n\nPractice coins can be refilled from Rules when below 512.`); return; }
        void this.runLoading(async () => {
            await this.ensureTable();
            this.room = room; this.lobby.active = false; this.table.active = true;
            this.showQuickSetting();
        });
    }
    private begin() {
        if (this.busy || this.dialog.active || this.quickSettingRoot.active) return;
        if (this.round && !this.round.ended) return;
        if (this.winnerRoot) this.winnerRoot.active = false; if (this.loseRoot) this.loseRoot.active = false;
        const boot = BOOTS[this.room];
        if (this.save.balance < boot * 512) { void this.runLoading(async () => { await this.ensureLobby(); this.showLobby(); this.message('ROOM BALANCE', 'Choose a lower room to continue.'); }); return; }
        this.names = shuffle(NAMES).slice(0, 5); this.names[2] = this.save.name;
        this.images = shuffle(Array.from({ length: this.portraits.length }, (_, i) => i).filter(i => i !== this.save.avatar)).slice(0, 4); this.images.splice(2, 0, this.save.avatar);
        this.startBalance = this.save.balance;
        const balances = Array.from({ length: 5 }, (_, i) => i === 2 ? this.save.balance : boot * (1000 + Math.floor(Math.random() * 1000)));
        this.round = new Round(boot, balances, this.save.rounds % 5); this.save.balance = this.round.players[2].money; this.persist();
        this.settled = false; this.busy = true; this.dialog.active = false;
        for (const n of this.at(this.table, 'Effect').children) n.active = false;
        for (let i = 1; i <= 5; i++) {
            const seat = this.at(this.table, `Players/0${i}`);
            for (const name of ['FX_Win', 'Crown']) { const n = this.find(seat, name); if (n) n.active = false; }
        }
        this.render();
        this.play(this.find(this.at(this.table, 'Effect'), 'StartGame'), 'Clip_StartGame'); this.sound('SendCard');
        for (let i = 0; i < 5; i++) {
            const poker = this.at(this.table, `Poker/0${i + 1}/Poker`); poker.active = false;
            this.scheduleOnce(() => { poker.active = true; const target = poker.position.clone(); poker.setPosition(target.x, target.y + 100); tween(poker).to(.3, { position: target }, { easing: 'quadOut' }).start(); this.sound('SendCard'); }, .22 * i);
        }
        this.scheduleOnce(() => { this.busy = false; this.newTurn(); this.render(); }, 1.6);
    }
    private newTurn() { this.clock = 15; this.aiDelay = 1.5 + Math.random() * 1.8; this.sound('Banker'); }
    private action(action: Action) {
        const r = this.round; if (!r || r.turn !== 2 || this.busy || this.dialog.active || !r.can(action)) return;
        this.perform(action);
    }
    private perform(action: Action) {
        const r = this.round!, actor = r.turn, target = action === 'show' ? r.showTarget() : -1;
        const potBefore = r.pot;
        r.act(action); this.sound(action === 'show' ? 'PKstart' : 'Bet');
        if (action !== 'pack') {
            const gold = this.at(this.table, `Gold/0${actor + 1}`); this.play(gold, 'Clip_PlayersGold_Hit');
        } else { const poker = this.at(this.table, `Poker/0${actor + 1}/Poker`); this.play(poker, 'Clip_Poker_Cover'); }
        this.save.balance = r.players[2].money; this.persist();
        if (r.pending) {
            this.pendingTime = 10;
            if (r.pending.to === 2) {
                this.message('SIDE SHOW', `${this.names[r.pending.from]} requests a comparison.\nAccept: the lower hand packs.\nReject: both players remain in the round.`);
                this.at(this.dialog, 'Close').active = false; this.at(this.dialog, 'Accept').active = true; this.at(this.dialog, 'Reject').active = true;
            } else { this.busy = true; this.scheduleOnce(() => { this.busy = false; if (this.round?.pending) this.answer(Math.random() < .72); }, 1.2); }
        } else if (action === 'show') this.duelEffect(actor, target);
        this.newTurn(); this.render();
        if (r.ended) this.finish();
        console.info('TeenPatti action', action, 'seat', actor, 'pot before', potBefore, 'pot after', r.pot);
    }
    private answer(accept: boolean) {
        if (!this.round?.pending) return;
        const actor = this.round.pending.from, target = this.round.pending.to; this.round.respond(accept); this.dialog.active = false; this.onClose = null;
        if (accept) this.duelEffect(actor, target);
        this.save.balance = this.round.players[2].money; this.persist(); this.newTurn(); this.render(); if (this.round.ended) this.finish();
    }
    private duelEffect(actor: number, target: number) {
        const pk = this.at(this.table, 'PK'); pk.active = true;
        const root = this.at(pk, 'PlayerPK'); this.at(root, 'Clock').active = false;
        for (const [side, suffix, i] of [['Red', 'R', actor], ['Blue', 'B', target]] as [string, string, number][]) {
            const group = this.at(root, side), p = this.at(group, 'Players' + suffix);
            this.at(p, 'Photo/mask/img').getComponent(Sprite)!.spriteFrame = this.portraits[this.images[i]];
            this.text(p, 'TXT_Name', this.names[i]);
            for (let j = 0; j < 3; j++) {
                const face = this.at(group, `Poker${suffix}/Card_${j + 1}/img`); face.active = true; face.getComponent(Sprite)!.spriteFrame = this.faces[this.round!.players[i].cards[j]];
            }
        }
        this.play(this.find(pk, 'PlayerPK'), 'Clip_PlayerPK_Start'); this.sound('PKresult');
        this.busy = true; this.scheduleOnce(() => { pk.active = false; this.busy = false; this.render(); }, 1.8);
    }
    private finish() {
        if (this.settled) return; this.settled = true; this.busy = true;
        const r = this.round!, win = r.winners.includes(2); this.save.rounds++; if (win) this.save.wins++;
        this.save.balance = r.players[2].money;
        const delta = this.save.balance - this.startBalance;
        this.save.history.unshift(`${win ? 'WIN' : 'LOSE'}  ${delta >= 0 ? '+' : ''}${delta}  ·  Boot ${r.boot}`); this.save.history = this.save.history.slice(0, 12); this.persist();
        this.sound(win ? 'win' : 'BellRing'); this.render();
        if (r.alive.length === 1) this.play(this.find(this.at(this.table, 'Effect'), 'AllPacked'), 'Clip_AllPacked');
        else if (r.award >= r.boot * 1024) this.play(this.find(this.at(this.table, 'Effect'), 'PotLimit'), 'Clip_PotLimit');
        for (const i of r.winners) { const seat = this.at(this.table, `Players/0${i + 1}`); this.find(seat, 'FX_Win')!.active = true; this.play(this.find(seat, 'Win'), 'Clip_PlayerWin'); this.play(this.find(seat, 'Crown'), 'Clip_Crown_Loop'); }
        this.scheduleOnce(() => {
            if (this.round !== r) return;
            this.busy = false;
            void this.runLoading(async () => { await this.ensureResult(win); if (this.round === r) this.showResult(win, delta); });
        }, 2.1);
    }
    private showResult(win: boolean, delta: number) {
        const r = this.round!;
        this.dialog.active = false;
        if (this.winnerRoot) this.winnerRoot.active = win; if (this.loseRoot) this.loseRoot.active = !win;
        const panel = win ? this.winnerRoot : this.loseRoot;
        this.text(panel, 'Content/PlayerName', this.save.name);
        this.text(panel, 'Content/Amount', `${delta >= 0 ? '+' : ''}${this.money(delta)}`);
        this.text(panel, 'Content/Balance', `BALANCE  ${this.money(this.save.balance)}`);
        this.text(panel, 'Content/HandName', `${HANDS[rank(r.players[2].cards)[0]]}${r.players[2].folded ? ' · PACKED' : ''}`);
        this.text(panel, 'Content/WinnerInfo', `${r.winners.map(i => this.names[i]).join(' & ')} · POT ${this.money(r.award)}`);
        for (let i = 0; i < 3; i++) this.at(panel, `Content/Card${i + 1}`).getComponent(Sprite)!.spriteFrame = this.faces[r.players[2].cards[i]];
        const content = this.at(panel, 'Content'); content.setPosition(0, 0);
        const target = content.position.clone(); content.setPosition(0, -20);
        tween(content).to(.25, { position: target }, { easing: 'quadOut' }).start();
    }
    private render() {
        const r = this.round; if (!r) return;
        this.text(this.table, 'RoomTitle', `TEEN PATTI · BOOT ${r.boot} · POT LIMIT ${this.money(r.boot * 1024)}`);
        this.text(this.table, 'Data/Num_Property', this.money(r.players[2].money));
        this.text(this.table, 'Gold/00/Num_Gold', this.money(r.ended ? r.award : r.pot));
        this.text(this.table, 'StatusLine', r.ended ? 'Round complete · Continue to play again' : `${this.names[r.turn]}'s turn · ${r.players[2].folded ? 'You packed. Watching the round.' : 'Three cards. One winner.'}`);
        for (let i = 0; i < 5; i++) {
            const p = r.players[i], seat = this.at(this.table, `Players/0${i + 1}`), player = this.find(seat, 'Players')!;
            this.find(player, 'TXT_Name')!.getComponent(Label)!.string = this.names[i];
            this.text(player, 'Balance', this.money(p.money)); this.text(player, 'ActionStatus', p.last);
            this.at(player, 'TurnClock').active = !r.ended && r.turn === i;
            this.at(player, 'Photo/mask/img/CountDown').active = !r.ended && r.turn === i;
            this.at(player, 'Photo/mask/img').getComponent(Sprite)!.spriteFrame = this.portraits[this.images[i]];
            player.getComponent(UIOpacity)!.opacity = p.folded ? 125 : 255;
            this.text(this.table, `Gold/0${i + 1}/Num_Gold`, this.money(p.paid));
            const poker = this.at(this.table, `Poker/0${i + 1}/Poker`); poker.active = !p.folded;
            for (let j = 0; j < 3; j++) {
                const n = this.at(poker, `Card_${j + 1}`); n.active = true;
                const face = this.at(n, 'img'); face.active = (i === 2 && p.seen) || (r.ended && !p.folded);
                face.getComponent(Sprite)!.spriteFrame = this.faces[p.cards[j]];
            }
            this.at(this.table, `PlayerSEE/0${i + 1}`).active = p.seen && !p.folded;
            const type = this.at(this.table, `PokerType/0${i + 1}`); type.active = !p.folded && ((i === 2 && p.seen) || r.ended);
            if (type.active) for (let k = 0; k < 6; k++) this.find(type, 'TXT' + k)!.active = k === rank(p.cards)[0];
        }
        const my = r.turn === 2 && !this.busy && !r.pending && !r.ended;
        for (const [idx, action] of [[1, 'pack'], [2, 'show'], [3, 'call'], [4, 'raise']] as [number, Action][]) {
            const n = this.at(this.table, `Btn/Btn_0${idx}`); n.active = !r.ended;
            n.getComponent(Button)!.interactable = my && r.can(action); n.getComponent(UIOpacity)!.opacity = my && r.can(action) ? 255 : 125;
        }
        const see = this.at(this.table, 'Btn/Btn_00'); see.active = !r.ended && !r.players[2].seen && !r.players[2].folded;
        this.at(this.table, 'Btn/Btn_05').active = r.ended;
        for (const idx of [2, 3, 4]) this.text(this.table, `Btn/Btn_0${idx}/Num`, this.money(r.cost(2, idx === 4)));
        this.text(this.table, 'Btn/Btn_02/Label', r.alive.length === 2 ? 'SHOW' : 'SIDE SHOW');
        this.text(this.table, 'Btn/Btn_03/Label', r.players[2].seen ? 'CHAAL' : 'BLIND');
    }
    update(dt: number) {
        if (this.loading) { const spinner = this.at(this.loadingOverlay, 'Spinner'); spinner.angle = (spinner.angle - 240 * dt) % 360; return; }
        const r = this.round; if (!r || !this.table.active || r.ended) return;
        if (r.pending) { this.pendingTime -= dt; if (this.pendingTime <= 0) this.answer(false); return; }
        if (this.busy || this.dialog.active) return;
        this.clock -= dt;
        const player = this.find(this.at(this.table, `Players/0${r.turn + 1}`), 'Players')!;
        this.text(player, 'TurnClock', String(Math.max(0, Math.ceil(this.clock))));
        const ring = this.at(player, 'Photo/mask/img').getComponent(ProgressBar); if (ring) ring.progress = Math.max(0, this.clock / 15);
        if (r.turn === 2) { if (this.clock <= 0) this.perform('pack'); return; }
        this.aiDelay -= dt; if (this.aiDelay > 0) return;
        const p = r.players[r.turn]; if (!p.seen && Math.random() < .4) r.see(r.turn);
        const strength = p.seen ? rank(p.cards)[0] : -1;
        const choice = Math.random();
        let action: Action = 'call';
        if (p.seen && strength === 0 && choice < .4) action = 'pack';
        else if (r.can('show') && choice < .35) action = 'show';
        else if (choice > .72 && (!p.seen || strength > 0)) action = 'raise';
        if (!r.can(action)) action = r.can('call') ? 'call' : 'pack';
        this.perform(action);
    }
    private message(title: string, body: string, close?: () => void, closeLabel = 'CLOSE') {
        this.dialog.active = true; this.onClose = close || null; this.confirmAction = null;
        this.text(this.dialog, 'Title', title); this.text(this.dialog, 'Body', body); this.text(this.dialog, 'Close/Label', closeLabel);
        this.at(this.dialog, 'Close').active = true; this.at(this.dialog, 'Accept').active = false; this.at(this.dialog, 'Reject').active = false;
        this.text(this.dialog, 'Accept/Label', 'ACCEPT');
        this.at(this.dialog, 'Close').setPosition(0, -179);
    }
    private help() {
        if (this.round?.pending || this.busy) return;
        const history = this.save.history.slice(0, 3).join('\n');
        const refill = this.lobby.active && this.save.balance < 512;
        this.message('HOW TO PLAY', `TRAIL > PURE SEQUENCE > SEQUENCE > COLOR > PAIR > HIGH CARD\nSEE reveals your three cards. Seen stakes are twice blind stakes.\nBLIND / CHAAL calls. RAISE doubles the current stake. PACK folds.\nSIDE SHOW needs both players seen; the opponent may decline.\nHeads-up SHOW compares hands; a tied requester loses.\nFour blind turns force SEE. Timer expiry packs your hand.\n\n${refill ? 'Close to refill your practice balance to 10,000.' : history || 'Practice coins only · Local computer opponents'}`, refill ? () => { this.save.balance = 10000; this.persist(); this.refreshLobby(); } : undefined);
    }
    private home() {
        if (this.busy || this.round?.pending || this.dialog.active) return;
        if (!this.lobby) { void this.runLoading(async () => { await this.ensureLobby(); this.home(); }); return; }
        if (this.winnerRoot) this.winnerRoot.active = false; if (this.loseRoot) this.loseRoot.active = false;
        if (this.round && !this.round.ended) {
            this.message('LEAVE TABLE?', 'Your committed coins stay in this round.\nLeaving forfeits your hand.', undefined, 'STAY');
            this.at(this.dialog, 'Close').setPosition(-150, -179);
            this.at(this.dialog, 'Accept').active = true; this.text(this.dialog, 'Accept/Label', 'LEAVE');
            this.confirmAction = () => { if (this.round) { this.round.players[2].folded = true; this.round.finish(); } this.round = null; this.table.active = false; this.lobby.active = true; this.refreshLobby(); };
        } else { this.round = null; this.table.active = false; this.lobby.active = true; this.refreshLobby(); }
    }
    onDestroy() { this.unscheduleAllCallbacks(); this.audio?.stop(); this.music?.stop(); }
}
