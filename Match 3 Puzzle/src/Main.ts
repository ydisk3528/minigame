import { Board } from "./game/Board";
import { GameSession } from "./game/GameSession";
import { GameAudio } from "./game/GameAudio";
import { LevelLoader } from "./game/LevelData";
import { MatchDetector } from "./game/MatchDetector";
import { PropBar } from "./game/PropBar";
import { FirstPlayGuide } from "./game/FirstPlayGuide";
import { GameConfig } from "./game/GameConfig";
import { GameSave } from "./game/GameSave";
import { MatchEffects } from "./game/MatchEffects";
import { DebugPanel } from "./game/DebugPanel";
import { ThemeConfig } from "./game/ThemeConfig";

interface LevelCatalogEntry { level: number; file: string; shape?: string; difficulty?: string; }
interface LevelCatalog { levels: LevelCatalogEntry[]; }
let availableLevels: LevelCatalogEntry[] = [];
const debugMode = typeof location !== "undefined" && new URLSearchParams(location.search).get("debug") === "1";

function highestCompletedLevel(): number {
    return GameSave.highestCompleted();
}

function markLevelCompleted(level: number, score: number): void {
    GameSave.completeLevel(level, score);
}

function isLevelUnlocked(level: number): boolean {
    return level <= highestCompletedLevel() + 1;
}

export async function main(): Promise<void> {
    GameSave.selfCheck();
    GameSave.initialize();
    await showStart();
}

async function showStart(): Promise<void> {
    Laya.timer.scale = 1;
    GameSave.hideBanner();
    const scene = await Laya.Scene.open("Start.ls", true);
    await ThemeConfig.applyScene(scene);
    const button = scene.getChildByName("PlayButton") as Laya.Sprite;
    if (!button) throw new Error("Start scene prefab bindings are missing.");
    button.on(Laya.Event.CLICK, null, (): void => void showLevelSelect());
}

async function showLevelSelect(): Promise<void> {
    Laya.timer.scale = 1;
    GameSave.hideBanner();
    const scene = await Laya.Scene.open("Level.ls", true);
    await ThemeConfig.applyScene(scene);
    const viewport = scene.getChildByName("LevelViewport") as Laya.Sprite;
    const countText = scene.getChildByName("LevelCountText") as Laya.GTextField;
    const back = scene.getChildByName("BackButton") as Laya.Sprite;
    if (!viewport || !countText || !back) throw new Error("Level scene prefab bindings are missing.");
    const [catalogResource] = await Promise.all([
        Laya.loader.load("resources/levels/catalog.json", Laya.Loader.JSON) as Promise<Laya.TextResource>,
        Laya.loader.load("resources/prefabs/ui/LevelButton.lh", Laya.Loader.HIERARCHY),
    ]);
    availableLevels = (catalogResource.data as LevelCatalog).levels;
    const completedLevel = highestCompletedLevel();
    const currentLevel = availableLevels.find((entry) => entry.level > completedLevel)?.level;
    countText.text = currentLevel
        ? `${availableLevels.length} LEVELS  ·  CURRENT ${currentLevel}`
        : `${availableLevels.length} LEVELS  ·  ALL CLEARED`;
    viewport.scrollRect = new Laya.Rectangle(0, 0, viewport.width, viewport.height);

    const columns = 3, rowHeight = 220, poolSize = 21;
    const buttons: Array<Laya.Sprite & { levelEntry?: LevelCatalogEntry }> = [];
    let offset = 0, dragStartY = 0, dragStartOffset = 0, dragged = false;
    const maxOffset = Math.max(0, Math.ceil(availableLevels.length / columns) * rowHeight - viewport.height);
    const render = (): void => {
        const firstRow = Math.floor(offset / rowHeight);
        const rowOffset = offset % rowHeight;
        for (let index = 0; index < buttons.length; index++) {
            const button = buttons[index];
            const row = Math.floor(index / columns);
            const column = index % columns;
            const entry = availableLevels[(firstRow + row) * columns + column];
            button.visible = Boolean(entry);
            button.levelEntry = entry;
            if (!entry) continue;
            const unlocked = isLevelUnlocked(entry.level);
            const buttonImage = button.getChildByName("ButtonImage") as Laya.GImage;
            const levelLabel = button.getChildByName("LevelLabel") as Laya.GTextField;
            const stateLabel = button.getChildByName("StateLabel") as Laya.GTextField;
            levelLabel.text = String(entry.level);
            levelLabel.color = unlocked ? "#FFFFFF" : "#7D8498";
            const best = GameSave.highScore(entry.level);
            stateLabel.text = entry.level <= completedLevel ? (best ? `BEST ${best}` : "CLEARED")
                : unlocked ? "CURRENT" : "LOCKED";
            stateLabel.color = entry.level <= completedLevel ? "#8BFFCA" : unlocked ? "#FFF0A8" : "#8A8F9E";
            buttonImage.color = unlocked ? "#FFFFFF" : "#686C78";
            button.alpha = unlocked ? 1 : 0.58;
            button.pos(column * 280, row * rowHeight - rowOffset);
        }
    };
    for (let index = 0; index < poolSize; index++) {
        const button = await Laya.Prefab.instantiate<Laya.Sprite>("resources/prefabs/ui/LevelButton.lh");
        if (!button.getChildByName("StateLabel")) {
            const state = new Laya.GTextField();
            state.name = "StateLabel";
            state.pos(25, 116);
            state.size(170, 34);
            state.fontSize = 18;
            state.bold = true;
            state.align = "center";
            state.valign = "middle";
            state.stroke = 3;
            state.strokeColor = "#30205F";
            button.addChild(state);
        }
        const pooled = button as Laya.Sprite & { levelEntry?: LevelCatalogEntry };
        pooled.on(Laya.Event.CLICK, null, (): void => {
            if (!dragged && pooled.levelEntry && isLevelUnlocked(pooled.levelEntry.level)) {
                void startGame(pooled.levelEntry.level);
            }
        });
        buttons.push(pooled);
        viewport.addChild(pooled);
    }
    render();
    const move = (): void => {
        const delta = Laya.stage.mouseY - dragStartY;
        if (Math.abs(delta) > 8) dragged = true;
        offset = Math.max(0, Math.min(maxOffset, dragStartOffset - delta));
        render();
    };
    const up = (): void => {
        Laya.stage.off(Laya.Event.MOUSE_MOVE, null, move);
        Laya.stage.off(Laya.Event.MOUSE_UP, null, up);
        Laya.stage.off(Laya.Event.MOUSE_OUT, null, up);
    };
    viewport.on(Laya.Event.MOUSE_DOWN, null, (): void => {
        dragStartY = Laya.stage.mouseY;
        dragStartOffset = offset;
        dragged = false;
        Laya.stage.on(Laya.Event.MOUSE_MOVE, null, move);
        Laya.stage.on(Laya.Event.MOUSE_UP, null, up);
        Laya.stage.on(Laya.Event.MOUSE_OUT, null, up);
    });
    viewport.on(Laya.Event.MOUSE_WHEEL, null, (event: Laya.Event): void => {
        offset = Math.max(0, Math.min(maxOffset, offset - (event.delta ?? 0) * 45));
        render();
    });
    back.on(Laya.Event.CLICK, null, (): void => void showStart());
}

async function startGame(levelNumber: number, allowLocked = false): Promise<void> {
    Laya.timer.scale = 1;
    if (!allowLocked && !isLevelUnlocked(levelNumber)) {
        await showLevelSelect();
        return;
    }
    const scene = await Laya.Scene.open("Scene.ls", true);
    await ThemeConfig.applyScene(scene);
    GameSave.showBanner();
    let slotLayer = scene.getChildByName("BoardSlotLayer") as Laya.Sprite;
    const gemLayer = scene.getChildByName("GemLayer") as Laya.Sprite;
    const effectLayer = scene.getChildByName("EffectLayer") as Laya.Sprite;
    const audioRoot = scene.getChildByName("AudioRoot") as Laya.Sprite;
    const statusText = scene.getChildByName("StatusText") as Laya.GTextField;
    const levelText = scene.getChildByName("LevelText") as Laya.GTextField;
    const scoreText = scene.getChildByName("ScoreText") as Laya.GTextField;
    const movesText = scene.getChildByName("MovesText") as Laya.GTextField;
    let goalRoot = scene.getChildByName("GoalRoot") as Laya.GPanel;
    const propBarRoot = scene.getChildByName("PropBar") as Laya.Sprite;

    if (!slotLayer && gemLayer) {
        slotLayer = new Laya.Sprite();
        slotLayer.name = "BoardSlotLayer";
        slotLayer.pos(gemLayer.x, gemLayer.y);
        slotLayer.size(gemLayer.width, gemLayer.height);
        scene.addChildAt(slotLayer, scene.getChildIndex(gemLayer));
    }
    if (!goalRoot) {
        goalRoot = new Laya.GPanel();
        goalRoot.name = "GoalRoot";
        goalRoot.pos(54, 372);
        goalRoot.size(972, 110);
        scene.addChild(goalRoot);
        const legacyGoal = scene.getChildByName("GoalText");
        if (legacyGoal) legacyGoal.visible = false;
    }
    goalRoot.scroller = new Laya.Scroller();
    goalRoot.scroller.direction = Laya.ScrollDirection.Horizontal;
    goalRoot.scroller.barDisplay = Laya.ScrollBarDisplay.Hidden;
    goalRoot.scroller.touchEffect = Laya.ScrollTouchEffect.On;
    goalRoot.scroller.bouncebackEffect = Laya.ScrollBounceBackEffect.On;

    MatchDetector.selfCheck();
    MatchEffects.selfCheck();
    if (!slotLayer || !gemLayer || !effectLayer || !audioRoot || !statusText || !levelText || !scoreText || !movesText || !goalRoot || !propBarRoot) {
        throw new Error("GameScene prefab bindings are missing.");
    }
    const background = scene.getChildByName("Background") as Laya.GImage;
    if (background) background.color = "#AAB5C6";
    await Promise.all([
        Laya.loader.load(GameConfig.boardPrefabs.goal, Laya.Loader.HIERARCHY),
        ThemeConfig.preload(),
    ]);
    const audio = new GameAudio(audioRoot);
    audio.setMusicEnabled(GameSave.musicEnabled());
    audio.setSoundEnabled(GameSave.soundEnabled());
    const entry = availableLevels.find((item) => item.level === levelNumber);
    const path = `resources/levels/${entry?.file ?? `level_${String(levelNumber).padStart(3, "0")}.json`}`;
    const level = await LevelLoader.load(path);
    const goalDisplays: Laya.Sprite[] = [];
    const goalWidth = 310, goalGap = 12;
    const goalsWidth = level.goals.length * goalWidth + Math.max(0, level.goals.length - 1) * goalGap;
    const goalsStartX = Math.max(0, (goalRoot.width - goalsWidth) / 2);
    for (let index = 0; index < level.goals.length; index++) {
        const display = await Laya.Prefab.instantiate<Laya.Sprite>(GameConfig.boardPrefabs.goal);
        for (let type = 0; type < ThemeConfig.texturePaths.length; type++) {
            const icon = display.getChildByName(`IconGem${type}`) as Laya.GImage;
            if (icon) icon.src = ThemeConfig.texture(type);
        }
        display.pos(goalsStartX + index * (goalWidth + goalGap), 3);
        goalRoot.addChild(display);
        goalDisplays.push(display);
    }
    goalRoot.layout.refresh();
    goalRoot.scroller.setPosX(0, false);
    const goalText = goalDisplays[0]?.getChildByName("GoalCountText") as Laya.GTextField;
    if (!goalText) throw new Error("Goal display prefab bindings are missing.");
    let board: Board | null = null;
    const currentLevelIndex = availableLevels.findIndex((item) => item.level === levelNumber);
    const nextLevel = currentLevelIndex >= 0 && currentLevelIndex + 1 < availableLevels.length
        ? availableLevels[currentLevelIndex + 1].level : null;
    const session = new GameSession(scene, level, levelText, scoreText, movesText, goalDisplays, audio,
        () => void startGame(levelNumber),
        nextLevel === null ? null : () => void startGame(nextLevel),
        () => void showLevelSelect(),
        () => board?.resumeAfterContinue(),
        () => board?.playWinShatter() ?? Promise.resolve(),
        (score) => markLevelCompleted(levelNumber, score));
    await session.initialize();
    let guide: FirstPlayGuide | null = null;
    board = new Board(slotLayer, gemLayer, effectLayer, statusText, goalText, audio, level, {
        onMoveUsed: () => { session.useMove(); guide?.onMoveUsed(); },
        onCleared: (types, specialAttack) => session.recordCleared(types, specialAttack),
        onObstacleDestroyed: (type) => session.recordObstacleDestroyed(type),
        onBoardStable: () => session.finishTurn(),
    });
    await board.initialize();
    const propBar = new PropBar(propBarRoot, board, session, level,
        (type) => guide?.onPropSelected(type),
        (type) => guide?.onPropUsed(type));
    await propBar.initialize();
    if (debugMode) {
        new DebugPanel(scene, level, board, session, (target) => {
            if (availableLevels.some((entry) => entry.level === target)) void startGame(target, true);
        }).initialize();
    }
    guide = await FirstPlayGuide.create(scene, board, propBar, level);
}

(window as unknown as { $_main_: () => Promise<void> }).$_main_ = main;
