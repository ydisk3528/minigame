import { MahjongSave } from "./game/MahjongSave";
import { GameContext, MahjongGame } from "./game/MahjongGame";
import { GuideSystem } from "./game/GuideSystem";
import { TaskDefinition, TaskSystem } from "./game/TaskSystem";
import { ThemeDefinition, ThemeSystem } from "./game/ThemeSystem";
import { GamePlatform } from "./platform/GamePlatform";
import { localizeTree, setEnglishUi, uiText, usesEnglishUi } from "./platform/UiText";
const { regClass } = Laya;

interface CatalogEntry { level: number; file: string; difficulty?: string; shape?: string; }
interface CatalogFile { maxLevel: number; levels: CatalogEntry[]; }
interface DailyChallengeConfig { levelPool: number[]; rewardCoins: number; }
type PropType = "undo" | "shuffle" | "move" | "hint" | "freeze";
let catalog: CatalogEntry[] = [];
let maxLevel = 0;
let dailyChallenge: DailyChallengeConfig = { levelPool: [1], rewardCoins: 250 };
const PRIVACY_BODY_EN = "This game stores progress, stars, coins, settings and prop inventory locally on your device so play can continue next time.\n\nThe game does not request your name, phone number, contacts, precise location, camera, microphone or payment information.\n\nRewarded ads are provided by the current platform and may process necessary device and network information under its privacy rules.\n\nThe game contains no gambling, wagering, cash withdrawal or real-money exchange. Minors should use the game with guardian guidance.\n\nTap CONFIRM after reading this privacy notice and user agreement.";
const PRIVACY_BODY_ZH = "本游戏仅在你的设备本地保存关卡进度、星级、金币、设置和道具数量，以便下次继续游戏。\n\n游戏不会申请或收集你的姓名、手机号码、通讯录、精确位置、相机、麦克风或支付信息。\n\n激励广告由当前运行平台提供，平台可能依据其隐私规则处理必要的设备与网络信息。\n\n本游戏不含赌博、下注、现金提现或真实货币兑换。未成年人应在监护人指导下使用。\n\n阅读本隐私政策与用户协议后，点击“确定”继续。";

export async function main(): Promise<void> {
    Laya.stage.scaleMode = Laya.Stage.SCALE_FIXED_AUTO;
    MahjongSave.selfCheck();
    MahjongSave.initialize();
    setEnglishUi(MahjongSave.language() === "en");
    if (typeof document !== "undefined") document.title = uiText("Mahjong Triple Quest");
    applyAudioSettings();
    const [resource, challengeResource] = await Promise.all([
        Laya.loader.load("resources/levels/catalog.json", Laya.Loader.JSON) as Promise<Laya.TextResource>,
        Laya.loader.load("resources/config/daily-challenge.json", Laya.Loader.JSON) as Promise<Laya.TextResource>,
        TaskSystem.initialize(), ThemeSystem.initialize(), GuideSystem.initialize(),
    ]);
    const data = resource.data as CatalogFile;
    maxLevel = Math.floor(Number(data.maxLevel));
    catalog = (data.levels ?? []).slice().sort((a, b) => a.level - b.level);
    dailyChallenge = challengeResource.data as DailyChallengeConfig;
    if (maxLevel < 1 || catalog.length !== maxLevel || catalog.some((entry, index) => entry.level !== index + 1)) throw new Error("Level catalog must contain maxLevel and continuous levels starting at 1");
    const params = typeof location === "undefined" || typeof URLSearchParams === "undefined" ? null : new URLSearchParams(location.search);
    const debugLevel = params?.get("debug") === "1" ? Number(params.get("level")) : 0;
    if (Number.isInteger(debugLevel) && catalog.some((entry) => entry.level === debugLevel)) {
        await startGame(debugLevel);
        return;
    }
    await showHome();
}

async function showHome(): Promise<void> {
    GamePlatform.hideBanner();
    const scene = await Laya.Scene.open("Home.ls", true);
    localizeTree(scene);
    ThemeSystem.applyScene(scene);
    const click = requireSound(scene, "ButtonClick");
    const refreshCoins = (): void => { (findNode(scene, "CoinText") as Laya.GTextField).text = String(MahjongSave.coins()); };
    bindPress(findNode(scene, "PlayButton") as Laya.Sprite, () => void (GuideSystem.needsGameGuide() ? startGame(catalog[0].level) : showLevels()), click);
    bindPress(findNode(scene, "SettingsButton") as Laya.Sprite, () => void showSettings(scene), click);
    bindPress(findNode(scene, "ShopButton") as Laya.Sprite, () => void showShop(scene, refreshCoins), click);
    bindPress(findNode(scene, "DailyButton") as Laya.Sprite, () => { GuideSystem.trigger("open_daily"); void showDaily(scene, refreshCoins); }, click);
    bindPress(findNode(scene, "TasksButton") as Laya.Sprite, () => { GuideSystem.trigger("open_tasks"); void showTasks(scene, refreshCoins); }, click);
    bindPress(findNode(scene, "ChallengeButton") as Laya.Sprite, () => { GuideSystem.trigger("open_challenge"); void showDailyChallenge(scene, refreshCoins); }, click);
    bindPress(findNode(scene, "ThemesButton") as Laya.Sprite, () => { GuideSystem.trigger("open_themes"); void showThemes(scene, refreshCoins); }, click);
    const share = findNode(scene, "ShareButton") as Laya.Sprite;
    share.visible = GamePlatform.canShare();
    if (share.visible) bindPress(share, () => GamePlatform.share({ title: uiText("Mahjong Triple Quest") }), click);
    else share.visible = false;
    refreshCoins();
    const current = catalog.find(entry => entry.level > MahjongSave.highestCompleted()) ?? catalog[catalog.length - 1];
    (findNode(scene, "LevelText") as Laya.GTextField).text = `${uiText("LEVEL")} ${current.level}`;
    await GuideSystem.attach("home", scene, (name) => findNode(scene, name) as Laya.Sprite);
    if (!MahjongSave.privacyAccepted()) await showPrivacy(scene, true, click);
}

async function showSettings(scene: Laya.Scene): Promise<void> {
    await Laya.loader.load("resources/prefabs/ui/SettingsPanel.lh", Laya.Loader.HIERARCHY);
    const panel = await Laya.Prefab.instantiate<Laya.Sprite>("resources/prefabs/ui/SettingsPanel.lh");
    localizeTree(panel);
    const music = panel.getChildByName("MusicButton") as Laya.Sprite;
    const sound = panel.getChildByName("SoundButton") as Laya.Sprite;
    const language = panel.getChildByName("LanguageButton") as Laya.Sprite;
    let englishSelected = usesEnglishUi();
    const refresh = (): void => {
        (music.getChildByName("Label") as Laya.GTextField).text = uiText(`MUSIC: ${MahjongSave.musicEnabled() ? "ON" : "OFF"}`);
        (sound.getChildByName("Label") as Laya.GTextField).text = uiText(`SOUND: ${MahjongSave.soundEnabled() ? "ON" : "OFF"}`);
        (language.getChildByName("Label") as Laya.GTextField).text = englishSelected ? uiText("ENGLISH · SELECTED") : "ENGLISH";
    };
    const click = requireSound(scene, "ButtonClick");
    bindPress(music, () => { MahjongSave.setMusicEnabled(!MahjongSave.musicEnabled()); applyAudioSettings(); if (MahjongSave.musicEnabled()) requireSound(scene, "HomeBgm").play(0); refresh(); }, click);
    bindPress(sound, () => { MahjongSave.setSoundEnabled(!MahjongSave.soundEnabled()); applyAudioSettings(); refresh(); }, click);
    bindPress(language, () => { englishSelected = true; refresh(); }, click);
    bindPress(panel.getChildByName("PrivacyButton") as Laya.Sprite, () => void showPrivacy(scene, false, click), click);
    bindPress(panel.getChildByName("ConfirmButton") as Laya.Sprite, () => {
        if (!englishSelected || usesEnglishUi()) { panel.destroy(); return; }
        MahjongSave.setLanguage("en"); setEnglishUi(true); panel.destroy(); void showHome();
    }, click);
    refresh(); contentRoot(scene).addChild(panel);
}

async function showPrivacy(scene: Laya.Scene, required: boolean, click: Laya.SoundNode): Promise<void> {
    if (contentRoot(scene).getChildByName("PrivacyPanel")) return;
    await Laya.loader.load("resources/prefabs/ui/PrivacyPanel.lh", Laya.Loader.HIERARCHY);
    if (scene.destroyed) return;
    const panel = await Laya.Prefab.instantiate<Laya.Sprite>("resources/prefabs/ui/PrivacyPanel.lh");
    localizeTree(panel);
    panel.zOrder = 1000000; panel.mouseEnabled = true; panel.mouseThrough = false;
    panel.hitArea = new Laya.Rectangle(0, 0, panel.width, panel.height);
    (panel.getChildByName("BodyText") as Laya.GTextField).text = usesEnglishUi() ? PRIVACY_BODY_EN : PRIVACY_BODY_ZH;
    (panel.getChildByName("NoteText") as Laya.GTextField).text = uiText(required ? "PLEASE READ BEFORE CONTINUING" : "YOU CAN REVIEW THIS AGREEMENT AT ANY TIME");
    const platform = panel.getChildByName("PlatformPrivacyButton") as Laya.Sprite;
    platform.visible = GamePlatform.canOpenPrivacyContract();
    if (platform.visible) bindPress(platform, () => GamePlatform.openPrivacyContract(), click);
    const confirm = panel.getChildByName("AgreeButton") as Laya.Sprite;
    (confirm.getChildByName("Label") as Laya.GTextField).text = uiText("CONFIRM");
    bindPress(confirm, () => { if (required) MahjongSave.acceptPrivacy(); panel.destroy(); }, click);
    contentRoot(scene).addChild(panel);
}

async function showShop(scene: Laya.Scene, refreshHomeCoins: () => void): Promise<void> {
    if (contentRoot(scene).getChildByName("ShopPanel")) return;
    await Laya.loader.load("resources/prefabs/ui/ShopPanel.lh", Laya.Loader.HIERARCHY);
    const panel = await Laya.Prefab.instantiate<Laya.Sprite>("resources/prefabs/ui/ShopPanel.lh");
    localizeTree(panel);
    const click = requireSound(scene, "ButtonClick");
    const status = panel.getChildByName("StatusText") as Laya.GTextField;
    const items = [["Undo", "undo", 100], ["Shuffle", "shuffle", 120], ["Move", "move", 150], ["Hint", "hint", 80], ["Freeze", "freeze", 130]] as const;
    const refresh = (): void => {
        (panel.getChildByName("CoinText") as Laya.GTextField).text = `${uiText("COINS")} ${MahjongSave.coins()}`;
        for (const [name, type] of items) (panel.getChildByName(`${name}Count`) as Laya.GTextField).text = `${uiText("OWNED")} ${MahjongSave.prop(type)}`;
        refreshHomeCoins();
    };
    for (const [name, type, price] of items) bindPress(panel.getChildByName(`${name}BuyButton`) as Laya.Sprite, () => {
        status.text = uiText(MahjongSave.buyProp(type, price) ? `${name.toUpperCase()} +1` : "NOT ENOUGH COINS");
        refresh();
    }, click);
    for (const [name, type] of items) bindPress(panel.getChildByName(`${name}InfoButton`) as Laya.Sprite, () => void showPropGuide(panel, type, click), click);
    bindPress(panel.getChildByName("CloseButton") as Laya.Sprite, () => { panel.destroy(); void GuideSystem.show(); }, click);
    refresh(); contentRoot(scene).addChild(panel);
}

async function showPropGuide(shop: Laya.Sprite, type: PropType, click: Laya.SoundNode): Promise<void> {
    if (shop.getChildByName("PropGuidePanel")) return;
    await Laya.loader.load("resources/prefabs/ui/PropGuidePanel.lh", Laya.Loader.HIERARCHY);
    if (shop.destroyed) return;
    const panel = await Laya.Prefab.instantiate<Laya.Sprite>("resources/prefabs/ui/PropGuidePanel.lh");
    const config = {
        undo: ["UNDO", "RETURNS THE LAST SELECTED TILE TO THE BOARD.", "icon_undo.png"],
        shuffle: ["SHUFFLE", "REARRANGES ALL REMAINING TILES ON THE BOARD.", "icon_shuffle.png"],
        move: ["MOVE OUT", "MOVES UP TO THREE SLOT TILES TO A TEMPORARY AREA.", "icon_move.png"],
        hint: ["HINT", "HIGHLIGHTS TILES THAT CAN FORM A MATCH.", "icon_hint.png"],
        freeze: ["FREEZE", "FREEZES THE LEVEL TIMER FOR 20 SECONDS.", "icon_freeze.png"],
    } as const;
    const [title, description, icon] = config[type];
    (panel.getChildByName("TitleText") as Laya.GTextField).text = uiText(title);
    (panel.getChildByName("DescriptionText") as Laya.GTextField).text = uiText(description);
    (panel.getChildByName("PropIcon") as Laya.GImage).src = `resources/images/ui/${icon}`;
    localizeTree(panel);
    panel.zOrder = 1000; panel.mouseEnabled = true; panel.mouseThrough = false;
    panel.hitArea = new Laya.Rectangle(0, 0, panel.width, panel.height);
    const tiles = [1, 2, 3].map(index => panel.getChildByName(`DemoTile${index}`) as Laya.Sprite);
    const positions = [[107, 430], [274, 430], [441, 430]];
    const animate = (): void => {
        tiles.forEach((tile, index) => {
            Laya.Tween.clearAll(tile); tile.pos(positions[index][0], positions[index][1]); tile.scale(1, 1); tile.alpha = 1;
            (tile.getChildByName("Face") as Laya.GImage).src = `resources/images/tiles/${type === "hint" || type === "freeze" ? "wan_1" : ["wan_1", "tong_1", "tiao_1"][index]}.png`;
        });
        if (type === "undo") {
            tiles[0].pos(441, 493); tiles[1].alpha = tiles[2].alpha = 0.25;
            Laya.Tween.to(tiles[0], { x: 107, y: 410 }, 650, Laya.Ease.quadInOut);
        } else if (type === "shuffle") {
            [441, 107, 274].forEach((x, index) => Laya.Tween.to(tiles[index], { x, y: 450 - index * 18 }, 650, Laya.Ease.sineInOut));
        } else if (type === "move") {
            tiles.forEach((tile, index) => Laya.Tween.to(tile, { y: 365, scaleX: 0.82, scaleY: 0.82, x: 135 + index * 145 }, 650, Laya.Ease.quadOut));
        } else if (type === "hint") {
            tiles.forEach(tile => Laya.Tween.to(tile, { y: 405, scaleX: 1.14, scaleY: 1.14, alpha: 0.65 }, 420, Laya.Ease.sineOut, Laya.Handler.create(null, () => Laya.Tween.to(tile, { y: 430, scaleX: 1, scaleY: 1, alpha: 1 }, 420, Laya.Ease.sineIn))));
        } else {
            tiles.forEach((tile, index) => { tile.filters = [new Laya.ColorFilter([0.65,0,0,0,40, 0,0.85,0,0,55, 0,0,1.2,0,70, 0,0,0,1,0])]; Laya.Tween.to(tile, { scaleX: 1.08, scaleY: 1.08, alpha: 0.72 }, 520 + index * 80, Laya.Ease.sineInOut); });
        }
    };
    const stop = (): void => { Laya.timer.clearAll(panel); tiles.forEach(tile => Laya.Tween.clearAll(tile)); };
    bindPress(panel.getChildByName("CloseButton") as Laya.Sprite, () => { stop(); panel.destroy(); }, click);
    panel.once(Laya.Event.REMOVED, panel, stop);
    shop.addChild(panel); animate(); Laya.timer.loop(1800, panel, animate);
}

async function showTasks(scene: Laya.Scene, refreshHomeCoins: () => void): Promise<void> {
    if (contentRoot(scene).getChildByName("TaskPanel")) return;
    await Promise.all([
        Laya.loader.load("resources/prefabs/ui/TaskPanel.lh", Laya.Loader.HIERARCHY),
        Laya.loader.load("resources/prefabs/ui/TaskRow.lh", Laya.Loader.HIERARCHY),
    ]);
    const panel = await Laya.Prefab.instantiate<Laya.Sprite>("resources/prefabs/ui/TaskPanel.lh");
    localizeTree(panel); contentRoot(scene).addChild(panel);
    const list = panel.getChildByName("ListLayer") as Laya.Sprite;
    const status = panel.getChildByName("StatusText") as Laya.GTextField;
    const click = requireSound(scene, "ButtonClick");
    let daily = true, page = 0, generation = 0;
    const render = async (): Promise<void> => {
        const current = ++generation;
        while (list.numChildren) list.getChildAt(0).destroy();
        const tasks = TaskSystem.tasks(daily), pageSize = 5, pageCount = Math.max(1, Math.ceil(tasks.length / pageSize)); page = Math.min(page, pageCount - 1);
        const visibleTasks = tasks.slice(page * pageSize, page * pageSize + pageSize);
        for (let index = 0; index < visibleTasks.length; index++) {
            const task = visibleTasks[index], row = await Laya.Prefab.instantiate<Laya.Sprite>("resources/prefabs/ui/TaskRow.lh");
            if (panel.destroyed || current !== generation) { row.destroy(); return; }
            const progress = TaskSystem.progress(task, daily), claimed = TaskSystem.claimed(task, daily), complete = progress >= task.target;
            row.y = index * 112;
            (row.getChildByName("TitleText") as Laya.GTextField).text = usesEnglishUi() ? task.titleEn : task.titleZh;
            (row.getChildByName("ProgressText") as Laya.GTextField).text = `${progress} / ${task.target}`;
            (row.getChildByName("RewardText") as Laya.GTextField).text = `+${task.reward}${task.rewardDecoration ? " +◆" : ""}`;
            (row.getChildByName("ProgressFill") as Laya.GImage).width = 190 * Math.min(1, progress / task.target);
            const claim = row.getChildByName("ClaimButton") as Laya.Sprite;
            (claim.getChildByName("Label") as Laya.GTextField).text = uiText(claimed ? "CLAIMED" : complete ? "CLAIM" : "IN PROGRESS");
            claim.alpha = complete && !claimed ? 1 : 0.5; claim.mouseEnabled = complete && !claimed;
            if (claim.mouseEnabled) bindPress(claim, () => {
                if (!TaskSystem.claim(task, daily)) return;
                requireSound(scene, "CoinReward").play(); refreshHomeCoins(); status.text = uiText("REWARD COLLECTED"); void render();
            }, click);
            list.addChild(row);
        }
        (panel.getChildByName("DailyTab") as Laya.Sprite).alpha = daily ? 1 : 0.58;
        (panel.getChildByName("AchievementTab") as Laya.Sprite).alpha = daily ? 0.58 : 1;
        const previous = panel.getChildByName("PrevPageButton") as Laya.Sprite, next = panel.getChildByName("NextPageButton") as Laya.Sprite;
        previous.alpha = page > 0 ? 1 : 0.4; previous.mouseEnabled = page > 0;
        next.alpha = page < pageCount - 1 ? 1 : 0.4; next.mouseEnabled = page < pageCount - 1;
        (panel.getChildByName("PageText") as Laya.GTextField).text = `${page + 1} / ${pageCount}`;
    };
    bindPress(panel.getChildByName("DailyTab") as Laya.Sprite, () => { daily = true; page = 0; void render(); }, click);
    bindPress(panel.getChildByName("AchievementTab") as Laya.Sprite, () => { daily = false; page = 0; void render(); }, click);
    bindPress(panel.getChildByName("PrevPageButton") as Laya.Sprite, () => { if (page > 0) { page--; void render(); } }, click);
    bindPress(panel.getChildByName("NextPageButton") as Laya.Sprite, () => { page++; void render(); }, click);
    bindPress(panel.getChildByName("CloseButton") as Laya.Sprite, () => { panel.destroy(); void GuideSystem.show(); }, click);
    await render();
}

function todayChallengeEntry(): CatalogEntry {
    const pool = dailyChallenge.levelPool.map(level => catalog.find(entry => entry.level === level)).filter((entry): entry is CatalogEntry => !!entry);
    const date = new Date(), day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
    return pool[((day % pool.length) + pool.length) % pool.length] ?? catalog[0];
}

async function showDailyChallenge(scene: Laya.Scene, refreshHomeCoins: () => void): Promise<void> {
    if (contentRoot(scene).getChildByName("ChallengePanel")) return;
    await Laya.loader.load("resources/prefabs/ui/ChallengePanel.lh", Laya.Loader.HIERARCHY);
    const panel = await Laya.Prefab.instantiate<Laya.Sprite>("resources/prefabs/ui/ChallengePanel.lh");
    localizeTree(panel); contentRoot(scene).addChild(panel);
    const entry = todayChallengeEntry(), completed = MahjongSave.dailyChallengeCompleted(), click = requireSound(scene, "ButtonClick");
    (panel.getChildByName("DateText") as Laya.GTextField).text = new Date().toLocaleDateString(usesEnglishUi() ? "en-US" : "zh-CN");
    (panel.getChildByName("LevelText") as Laya.GTextField).text = `${uiText("SPECIAL LAYOUT")} · ${uiText("LEVEL")} ${entry.level}`;
    (panel.getChildByName("RewardText") as Laya.GTextField).text = `${dailyChallenge.rewardCoins} ${uiText("COINS")}`;
    (panel.getChildByName("StatusText") as Laya.GTextField).text = uiText(completed ? "TODAY'S REWARD COLLECTED" : "COMPLETE ONCE TO EARN THE REWARD");
    const start = panel.getChildByName("StartButton") as Laya.Sprite;
    (start.getChildByName("Label") as Laya.GTextField).text = uiText(completed ? "PLAY AGAIN" : "START CHALLENGE");
    bindPress(start, () => {
        const context: GameContext = {
            displayTitle: uiText("DAILY CHALLENGE"), completeTitle: uiText("CHALLENGE COMPLETE"),
            complete: stars => MahjongSave.completeDailyChallenge(dailyChallenge.rewardCoins, stars),
            primaryLabel: uiText("HOME"), primaryAction: () => void showHome(), hideSecondary: true,
        };
        void startGame(entry.level, context);
    }, click);
    bindPress(panel.getChildByName("CloseButton") as Laya.Sprite, () => { refreshHomeCoins(); panel.destroy(); void GuideSystem.show(); }, click);
}

async function showThemes(scene: Laya.Scene, refreshHomeCoins: () => void): Promise<void> {
    if (contentRoot(scene).getChildByName("ThemePanel")) return;
    await Laya.loader.load("resources/prefabs/ui/ThemePanel.lh", Laya.Loader.HIERARCHY);
    const panel = await Laya.Prefab.instantiate<Laya.Sprite>("resources/prefabs/ui/ThemePanel.lh");
    localizeTree(panel); contentRoot(scene).addChild(panel);
    const click = requireSound(scene, "ButtonClick"), status = panel.getChildByName("StatusText") as Laya.GTextField;
    const refresh = (): void => {
        ThemeSystem.all().slice(0, 3).forEach((theme, index) => {
            const card = panel.getChildByName(`Theme${index + 1}`) as Laya.Sprite, unlocked = MahjongSave.themeUnlocked(theme.id), selected = MahjongSave.selectedTheme() === theme.id;
            (card.getChildByName("TitleText") as Laya.GTextField).text = usesEnglishUi() ? theme.titleEn : theme.titleZh;
            ThemeSystem.applyPreview(card.getChildByName("PreviewBackground") as Laya.Sprite, theme, true);
            ThemeSystem.applyPreview(card.getChildByName("PreviewTile") as Laya.Sprite, theme);
            ThemeSystem.applyButtonPreview(card.getChildByName("SelectButton") as Laya.Sprite, theme);
            const select = card.getChildByName("SelectButton") as Laya.Sprite;
            (select.getChildByName("Label") as Laya.GTextField).text = uiText(selected ? "SELECTED" : unlocked ? "SELECT" : theme.unlockAchievement ? "ACHIEVEMENT REWARD" : `${theme.cost} COINS`);
            select.alpha = selected || (!unlocked && !!theme.unlockAchievement) ? 0.58 : 1; select.mouseEnabled = !selected && (unlocked || !theme.unlockAchievement);
        });
        (panel.getChildByName("CoinText") as Laya.GTextField).text = `${uiText("COINS")} ${MahjongSave.coins()}`;
        refreshHomeCoins(); ThemeSystem.applyScene(scene);
    };
    ThemeSystem.all().slice(0, 3).forEach((theme, index) => {
        const card = panel.getChildByName(`Theme${index + 1}`) as Laya.Sprite, select = card.getChildByName("SelectButton") as Laya.Sprite;
        bindPress(select, () => {
            if (theme.unlockAchievement && !MahjongSave.themeUnlocked(theme.id)) { status.text = uiText("UNLOCKED BY ACHIEVEMENT"); return; }
            if (!MahjongSave.themeUnlocked(theme.id) && !ThemeSystem.unlock(theme)) { status.text = uiText("NOT ENOUGH COINS"); return; }
            ThemeSystem.select(theme); status.text = uiText("THEME SELECTED"); refresh();
        }, click);
    });
    bindPress(panel.getChildByName("CloseButton") as Laya.Sprite, () => { panel.destroy(); void GuideSystem.show(); }, click);
    refresh();
}

async function showDaily(scene: Laya.Scene, refreshHomeCoins: () => void): Promise<void> {
    if (contentRoot(scene).getChildByName("DailyPanel")) return;
    await Laya.loader.load("resources/prefabs/ui/DailyPanel.lh", Laya.Loader.HIERARCHY);
    const panel = await Laya.Prefab.instantiate<Laya.Sprite>("resources/prefabs/ui/DailyPanel.lh");
    localizeTree(panel);
    const claim = panel.getChildByName("ClaimButton") as Laya.Sprite;
    const label = claim.getChildByName("Label") as Laya.GTextField;
    const doubleClaim = panel.getChildByName("DoubleClaimButton") as Laya.Sprite;
    const doubleLabel = doubleClaim.getChildByName("Label") as Laya.GTextField;
    const status = panel.getChildByName("StatusText") as Laya.GTextField;
    const streak = panel.getChildByName("StreakText") as Laya.GTextField;
    const rewardText = panel.getChildByName("RewardText") as Laya.GTextField;
    let adPending = false;
    const refresh = (message?: string): void => {
        const available = MahjongSave.canClaimDaily(), day = MahjongSave.dailyDay(), reward = MahjongSave.dailyReward(day);
        label.text = available ? `${uiText("CLAIM")} ${reward}` : uiText("CLAIMED TODAY");
        doubleLabel.text = available ? `${uiText("WATCH AD · GET")} ${reward * 2}` : uiText("CLAIMED TODAY");
        claim.alpha = doubleClaim.alpha = available && !adPending ? 1 : 0.55;
        claim.mouseEnabled = doubleClaim.mouseEnabled = available && !adPending;
        streak.text = usesEnglishUi() ? (available ? `DAY ${day} OF 7` : `DAY ${day} COMPLETE`) : (available ? `第 ${day} / 7 天` : `第 ${day} 天已完成`);
        rewardText.text = `${reward} ${uiText("COINS")}`;
        for (let index = 1; index <= 7; index++) (panel.getChildByName(`Day${index}`) as Laya.Sprite).alpha = index === day ? 1 : index < day ? 0.72 : 0.42;
        status.text = uiText(message ?? (available ? "YOUR DAILY COINS ARE READY" : "COME BACK TOMORROW"));
        refreshHomeCoins();
    };
    bindPress(claim, () => {
        const amount = MahjongSave.claimDailyReward();
        if (amount) {
            requireSound(scene, "CoinReward").play();
            refresh(usesEnglishUi() ? `${amount} COINS COLLECTED` : `已领取 ${amount} 金币`);
        } else refresh();
    }, requireSound(scene, "ButtonClick"));
    bindPress(doubleClaim, () => {
        if (adPending || !MahjongSave.canClaimDaily()) return;
        adPending = true; refresh("PLAYING REWARDED AD...");
        void GamePlatform.showRewardVideo().then((rewarded) => {
            adPending = false;
            if (panel.destroyed) return;
            const amount = rewarded ? MahjongSave.claimDailyReward(2) : 0;
            if (amount) {
                requireSound(scene, "CoinReward").play();
                refresh(usesEnglishUi() ? `${amount} COINS COLLECTED` : `已领取 ${amount} 金币`);
            } else refresh("WATCH THE FULL AD TO GET 2X");
        });
    }, requireSound(scene, "ButtonClick"));
    bindPress(panel.getChildByName("CloseButton") as Laya.Sprite, () => { panel.destroy(); void GuideSystem.show(); }, requireSound(scene, "ButtonClick"));
    refresh(); contentRoot(scene).addChild(panel);
}

async function showLevels(): Promise<void> {
    GamePlatform.hideBanner();
    const scene = await Laya.Scene.open("Level.ls", true);
    localizeTree(scene);
    ThemeSystem.applyScene(scene);
    const list = findNode(scene, "LevelList") as Laya.GList;
    const click = requireSound(scene, "ButtonClick");
    bindPress(findNode(scene, "BackButton") as Laya.Sprite, () => void showHome(), click);
    const template = await Laya.loader.load("resources/prefabs/ui/LevelButton.lh", Laya.Loader.HIERARCHY) as Laya.Prefab;
    list.layout.type = Laya.LayoutType.FlowX; list.layout.columns = 4; list.layout.columnGap = 18; list.layout.rowGap = 20; list.layout.itemSize = new Laya.Point(132, 122);
    const scroller = new Laya.Scroller(); list.scroller = scroller; scroller.direction = Laya.ScrollDirection.Vertical; scroller.barDisplay = Laya.ScrollBarDisplay.OnScroll; scroller.step = 142;
    list.itemTemplate = template;
    list.itemRenderer = (index: number, item: Laya.GBox): void => {
        const entry = catalog[index], button = item as Laya.GBox;
        button.offAll(); Laya.Tween.clearAll(button); button.scale(1, 1);
        const unlocked = entry.level === 1 || entry.level - 1 <= MahjongSave.highestCompleted();
        const stars = MahjongSave.stars(entry.level);
        button.alpha = unlocked ? 1 : 0.45;
        (button.getChildByName("LevelText") as Laya.GTextField).text = String(entry.level);
        (button.getChildByName("StateText") as Laya.GTextField).text = uiText(stars > 0 || entry.level <= MahjongSave.highestCompleted() ? "COMPLETED" : unlocked ? "CURRENT" : "LOCKED");
        (button.getChildByName("StarsText") as Laya.GTextField).text = stars ? `${"★".repeat(stars)}${"☆".repeat(3 - stars)}` : "☆☆☆";
        if (unlocked) bindPress(button, () => void startGame(entry.level), click);
        else button.mouseEnabled = false;
        ThemeSystem.applyButtonPreview(button, ThemeSystem.current());
    };
    list.setVirtual(); list.numItems = maxLevel;
    (findNode(scene, "LevelCountText") as Laya.GTextField).text = usesEnglishUi() ? `${maxLevel} LEVELS · SWIPE TO SCROLL` : `共 ${maxLevel} 关 · 上下滑动`;
    list.scroller.scrollTo(Math.min(maxLevel - 1, MahjongSave.highestCompleted()), false, true);
}

async function startGame(level: number, context?: GameContext): Promise<void> {
    const scene = await Laya.Scene.open("Game.ls", true);
    localizeTree(scene);
    ThemeSystem.applyScene(scene);
    GamePlatform.showBanner();
    const entry = catalog.find((item) => item.level === level);
    if (!entry) throw new Error(`Level ${level} was not found`);
    const index = catalog.indexOf(entry);
    const game = new MahjongGame(scene, `resources/levels/${entry.file}`, {
        home: () => void showHome(), levels: () => void showLevels(), restart: () => void startGame(level, context),
        next: index < catalog.length - 1 ? () => void startGame(catalog[index + 1].level) : null,
        goTo: (target) => { const destination = catalog.find(item => item.level === target) ?? catalog[Math.max(0, Math.min(catalog.length - 1, index + Math.sign(target - level)))]; void startGame(destination.level); },
    }, context);
    await game.initialize();
}

function bindPress(button: Laya.Sprite, action: () => void, click?: Laya.SoundNode): void {
    if (!button) throw new Error("Scene button binding is missing");
    button.mouseEnabled = true;
    button.mouseThrough = false;
    button.hitArea = new Laya.Rectangle(0, 0, button.width, button.height);
    button.on(Laya.Event.MOUSE_DOWN, null, () => Laya.Tween.to(button, { scaleX: 0.94, scaleY: 0.94 }, 70));
    button.on(Laya.Event.MOUSE_UP, null, () => Laya.Tween.to(button, { scaleX: 1, scaleY: 1 }, 90, Laya.Ease.backOut));
    button.on(Laya.Event.MOUSE_OUT, null, () => Laya.Tween.to(button, { scaleX: 1, scaleY: 1 }, 90));
    button.on(Laya.Event.CLICK, null, () => { click?.play(); action(); });
}

function applyAudioSettings(): void {
    Laya.SoundManager.musicMuted = !MahjongSave.musicEnabled();
    Laya.SoundManager.soundMuted = !MahjongSave.soundEnabled();
    Laya.SoundManager.musicVolume = 0.38;
    Laya.SoundManager.soundVolume = 0.82;
}

function requireSound(scene: Laya.Scene, name: string): Laya.SoundNode {
    const sound = findNode(scene, name) as Laya.SoundNode;
    if (!sound) throw new Error(`Scene audio binding is missing: ${name}`);
    return sound;
}

function contentRoot(scene: Laya.Scene): Laya.Sprite {
    const root = scene.getChildByName("ContentRoot") as Laya.Sprite;
    if (!root) throw new Error("Scene ContentRoot binding is missing");
    return root;
}

function findNode(scene: Laya.Scene, name: string): Laya.Node | null {
    return contentRoot(scene).getChildByName(name) ?? scene.getChildByName(name);
}

/** The bootstrap scene runs the main entry once. */
@regClass()
export class Main extends Laya.Script {
    public onStart(): void { void main(); }
}
