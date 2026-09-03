import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assets = path.join(project, "assets");
const readUuid = (relative) => JSON.parse(fs.readFileSync(path.join(project, `${relative}.meta`), "utf8")).uuid;
const res = (relative) => `res://${readUuid(relative)}`;
const image = (id, name, x, y, width, height, source) => ({ _$id: id, _$type: "GImage", name, x, y, width, height, src: res(source), autoSize: false });
const text = (id, name, x, y, width, height, value, size = 30, color = "#36584B", bold = false) => ({ _$id: id, _$type: "GTextField", name, x, y, width, height, text: value, fontSize: size, color, bold, align: "center", valign: "middle" });
const sprite = (id, name, x, y, width, height, children = []) => ({ _$id: id, _$type: "Sprite", name, x, y, width, height, _$child: children });
const list = (id, name, x, y, width, height) => ({ _$id: id, _$type: "GList", name, x, y, width, height, clipping: true });
const mahjong = (id, name, x, y, width, height, face) => sprite(id, name, x, y, width, height, [
  image(`${id}-base`, "Base", 0, 0, width, height, "assets/resources/images/tiles/tile_base.png"),
  image(`${id}-face`, "Face", 0, 0, width, height, face)
]);
const button = (id, name, x, y, width, height, source, label, fontSize = 30) => sprite(id, name, x, y, width, height, [
  image(`${id}i`, "ButtonImage", 0, 0, width, height, source),
  text(`${id}t`, "Label", 0, 0, width, height - 8, label, fontSize, source.includes("primary") ? "#FFF9E9" : "#3F6555", true)
]);
const sound = (id, name, source, isMusic = false, autoPlay = false) => ({ _$id: id, _$type: "SoundNode", name, source: res(source), isMusic, loop: isMusic ? 0 : 1, autoPlay });
const burstOffsets = [[-82,0],[-60,-60],[0,-86],[60,-60],[82,0],[60,60],[0,86],[-60,60],[-42,-18],[42,-18],[42,38],[-42,38]];
const mergeBurst = (id, name) => ({ ...sprite(id, name, 0, 0, 240, 240, burstOffsets.map(([x, y], index) => image(`${id}-${index}`, `Spark${index + 1}`, 102 + x, 102 + y, 36, 36, "assets/resources/images/effects/merge_spark.png"))), visible: false });
const background = () => ({ ...image("bg", "Background", 0, 0, 750, 1334, "assets/resources/images/background/game_bg.png"), _$comp: [{ _$type: readUuid("src/game/BackgroundAdapter.ts"), scriptPath: "../src/game/BackgroundAdapter.ts" }] });
const scene = (id, name, children) => {
  const fixed = children.filter((node) => node.name === "Background" || node._$type === "SoundNode");
  const content = children.filter((node) => node.name !== "Background" && node._$type !== "SoundNode");
  return { _$ver: 1, _$id: id, _$type: "Scene", left: 0, right: 0, top: 0, bottom: 0, name, width: 750, height: 1334, _$child: [
    ...fixed,
    { _$id: `${id}-content`, _$type: "GBox", name: "ContentRoot", width: 750, height: 1334,
      relations: [{ _$type: "Relation", target: { _$ref: id }, data: [6, 0, 13, 0] }], _$child: content }
  ] };
};
const write = (relative, value, uuid) => {
  const target = path.join(assets, relative); fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(value, null, 2) + "\n");
  fs.writeFileSync(`${target}.meta`, JSON.stringify({ uuid }, null, 2) + "\n");
};

write("Home.ls", scene("home-root", "HomeScene", [
  background(),
  sound("home-bgm", "HomeBgm", "assets/audio/home_bgm.mp3", true, true),
  sound("home-click", "ButtonClick", "assets/audio/button_click.wav"),
  sound("home-coin-reward", "CoinReward", "assets/audio/coin_reward.mp3"),
  image("coin-chip", "CoinChip", 510, 34, 190, 70, "assets/resources/images/ui/hud_chip.png"),
  image("coin-icon", "CoinIcon", 530, 43, 52, 52, "assets/resources/images/ui/icon_coin.png"),
  text("coin-text", "CoinText", 578, 42, 100, 48, "0", 28, "#496958", true),
  text("title-a", "TitleA", 70, 174, 610, 84, "MAHJONG", 56, "#345D4D", true),
  text("title-b", "TitleB", 70, 252, 610, 58, "TRIPLE QUEST", 31, "#A64B3F", true),
  image("hero-panel", "HeroPanel", 95, 350, 560, 292, "assets/resources/images/ui/panel.png"),
  text("hero-caption", "HeroCaption", 215, 374, 320, 36, "PICK · SLOT · MATCH", 20, "#71887A", true),
  mahjong("hero-1", "HeroTile1", 204, 438, 105, 139, "assets/resources/images/tiles/wan_1.png"),
  mahjong("hero-2", "HeroTile2", 323, 414, 105, 139, "assets/resources/images/tiles/tong_1.png"),
  mahjong("hero-3", "HeroTile3", 442, 438, 105, 139, "assets/resources/images/tiles/tiao_1.png"),
  button("play", "PlayButton", 165, 700, 420, 126, "assets/resources/images/ui/button_primary.png", "PLAY", 42),
  text("level", "LevelText", 215, 835, 320, 52, "LEVEL 1", 28, "#4D705F", true),
  button("settings", "SettingsButton", 45, 960, 200, 92, "assets/resources/images/ui/button_secondary.png", "SETTINGS", 18),
  button("shop", "ShopButton", 275, 960, 200, 92, "assets/resources/images/ui/button_secondary.png", "SHOP", 20),
  button("daily", "DailyButton", 505, 960, 200, 92, "assets/resources/images/ui/button_secondary.png", "DAILY", 18),
  button("tasks", "TasksButton", 45, 1075, 200, 92, "assets/resources/images/ui/button_secondary.png", "TASKS", 18),
  button("challenge", "ChallengeButton", 275, 1075, 200, 92, "assets/resources/images/ui/button_secondary.png", "CHALLENGE", 16),
  button("themes", "ThemesButton", 505, 1075, 200, 92, "assets/resources/images/ui/button_secondary.png", "DECOR", 18),
  button("share", "ShareButton", 545, 1190, 170, 82, "assets/resources/images/ui/button_secondary.png", "SHARE", 18),
  text("foot", "Footnote", 100, 1210, 550, 38, "CLEAR EVERY MAHJONG STACK", 18, "#71887A")
]), "a1000001-1111-4111-8111-000000000001");

write("Level.ls", scene("level-root", "LevelScene", [
  background(),
  sound("level-bgm", "LevelBgm", "assets/audio/level_bgm.mp3", true, true),
  sound("level-click", "ButtonClick", "assets/audio/button_click.wav"),
  button("back", "BackButton", 34, 34, 104, 104, "assets/resources/images/ui/icon_home.png", "", 1),
  text("title", "Title", 150, 46, 450, 70, "SELECT LEVEL", 40, "#345D4D", true),
  image("panel", "ListPanel", 35, 155, 680, 970, "assets/resources/images/ui/panel_large.png"),
  list("list", "LevelList", 78, 210, 594, 810),
  text("level-count", "LevelCountText", 185, 1040, 380, 42, "20 LEVELS · SWIPE TO SCROLL", 19, "#496958", true),
  text("tip", "Tip", 75, 1125, 600, 44, "CLEAR THIS LEVEL TO UNLOCK THE NEXT", 19, "#71887A")
]), "a1000002-2222-4222-8222-000000000002");

const gameChildren = [background(),
  sound("game-bgm", "GameBgm", "assets/audio/game_bgm.mp3", true, true),
  sound("game-button-click", "ButtonClick", "assets/audio/button_click.wav"),
  sound("game-tile-click", "TileClick", "assets/audio/tile_click.mp3"),
  sound("game-undo", "Undo", "assets/audio/undo.mp3"),
  sound("game-hint", "Hint", "assets/audio/hint.mp3"),
  sound("game-shuffle", "Shuffle", "assets/audio/shuffle.mp3"),
  sound("game-move-out", "MoveOut", "assets/audio/move_out.mp3"),
  sound("game-freeze", "Freeze", "assets/audio/freeze.mp3"),
  sound("game-coin-reward", "CoinReward", "assets/audio/coin_reward.mp3"),
  sound("game-victory", "Victory", "assets/audio/victory.mp3"),
  sound("game-failure", "Failure", "assets/audio/failure.mp3"),
  button("home", "HomeButton", 24, 22, 88, 88, "assets/resources/images/ui/icon_home.png", "", 1),
  button("restart", "RestartButton", 638, 22, 88, 88, "assets/resources/images/ui/icon_restart.png", "", 1),
  image("level-chip", "LevelChip", 120, 30, 175, 76, "assets/resources/images/ui/hud_chip.png"),
  text("level-text", "LevelText", 120, 32, 175, 64, "LEVEL 1", 22, "#456856", true),
  image("limit-chip", "LimitChip", 305, 30, 140, 76, "assets/resources/images/ui/hud_chip.png"),
  text("limit-text", "LimitText", 305, 32, 140, 64, "TIME 3:00", 20, "#A64B3F", true),
  image("score-chip", "ScoreChip", 455, 30, 175, 76, "assets/resources/images/ui/hud_chip.png"),
  text("score-label", "ScoreLabel", 460, 37, 55, 50, "SCORE", 15, "#71887A"),
  text("score-text", "ScoreText", 515, 34, 100, 56, "0", 24, "#456856", true),
  sprite("board", "BoardLayer", 0, 0, 750, 850),
  sprite("effects", "EffectLayer", 0, 0, 750, 850, [mergeBurst("merge-template", "MergeEffectTemplate")]),
  text("status", "StatusText", 125, 720, 500, 90, "", 42, "#A64B3F", true),
  sprite("extra", "ExtraLayer", 180, 806, 300, 96),
  image("tray-panel", "TrayPanel", 35, 900, 680, 150, "assets/resources/images/ui/panel.png"),
  sprite("slot-bg", "SlotBackplates", 67, 920, 616, 108),
  sprite("slot", "SlotLayer", 67, 920, 616, 108),
  { ...image("freeze-overlay", "FreezeOverlay", -18, -26, 786, 1386, "assets/resources/images/effects/freeze_overlay.png"), visible: false, mouseEnabled: false, mouseThrough: true },
];
const props = [["undo","Undo","UNDO"],["shuffle","Shuffle","SHUFFLE"],["move","Move","MOVE OUT"],["hint","Hint","HINT"],["freeze","Freeze","FREEZE"]];
props.forEach(([key, pascal, label], index) => {
  gameChildren.push(button(`${key}-button`, `${pascal}Button`, 47 + index * 132, 1105, 92, 92, `assets/resources/images/ui/icon_${key}.png`, "", 1));
  gameChildren.push(text(`${key}-label`, `${pascal}Label`, 38 + index * 132, 1193, 110, 30, label, 15, "#496958", true));
  gameChildren.push(text(`${key}-count`, `${pascal}Count`, 106 + index * 132, 1095, 42, 32, "×3", 16, "#A64B3F", true));
  gameChildren.push({ ...image(`${key}-ad`, `${pascal}AdIcon`, 106 + index * 132, 1097, 36, 36, "assets/resources/images/ui/ad_reward_icon.png"), visible: false });
});
write("Game.ls", scene("game-root", "GameScene", gameChildren), "a1000003-3333-4333-8333-000000000003");

write("resources/prefabs/game/MahjongTile.lh", { ...sprite("tile-root", "MahjongTile", 0, 0, 92, 122, [
  image("tile-base", "Base", 0, 0, 92, 122, "assets/resources/images/tiles/tile_base.png"),
  image("tile-face", "Face", 0, 0, 92, 122, "assets/resources/images/tiles/wan_1.png"),
  { ...text("tile-debug", "DebugText", 2, 28, 88, 58, "#1001\nL1 FREE", 11, "#FFFFFF", true), stroke: 3, strokeColor: "#304A40", visible: false }
]), _$ver: 1 }, "a2000001-1111-4111-8111-000000000001");

write("resources/prefabs/effects/MergeBurst.lh", { ...mergeBurst("merge-burst", "MergeBurst"), visible: true, _$ver: 1 }, "aa300002-b222-4c22-8222-000000000002");

write("resources/prefabs/ui/LevelButton.lh", { ...sprite("level-button", "LevelButton", 0, 0, 132, 122, [
  image("level-button-image", "ButtonImage", 0, 0, 132, 105, "assets/resources/images/ui/button_secondary.png"),
  text("level-number", "LevelText", 12, 5, 108, 48, "1", 30, "#3F6555", true),
  text("level-state", "StateText", 10, 50, 112, 22, "CURRENT", 11, "#A64B3F", true),
  text("level-stars", "StarsText", 8, 73, 116, 24, "☆☆☆", 17, "#C79A46", true)
]), _$type: "GBox", _$ver: 1 }, "a2000002-2222-4222-8222-000000000002");

write("resources/prefabs/ui/ResultPanel.lh", { ...sprite("result-root", "ResultPanel", 55, 250, 640, 760, [
  image("result-panel", "PanelImage", 0, 0, 640, 760, "assets/resources/images/ui/panel_large.png"),
  text("result-title", "TitleText", 45, 65, 550, 85, "LEVEL COMPLETE", 42, "#345D4D", true),
  text("result-stars", "StarsText", 70, 165, 500, 70, "★  ★  ★", 46, "#C79A46", true),
  text("result-detail", "DetailText", 70, 250, 500, 55, "100 COINS EARNED", 24, "#5F786B"),
  button("result-primary", "PrimaryButton", 110, 335, 420, 108, "assets/resources/images/ui/button_primary.png", "NEXT LEVEL", 27),
  button("result-secondary", "SecondaryButton", 150, 470, 340, 92, "assets/resources/images/ui/button_secondary.png", "RESTART", 23),
  button("result-level-select", "LevelSelectButton", 150, 590, 340, 92, "assets/resources/images/ui/button_secondary.png", "LEVEL SELECT", 21)
]), _$ver: 1 }, "a2000003-3333-4333-8333-000000000003");

write("resources/prefabs/ui/GuideOverlay.lh", { ...sprite("guide-overlay-root", "GuideOverlay", 0, 0, 750, 1334, [
  image("guide-overlay-hand", "HandImage", 0, 0, 88, 88, "assets/resources/images/ui/icon_hand.png"),
  sprite("guide-overlay-message", "MessagePanel", 75, 760, 600, 150, [
    image("guide-overlay-message-bg", "PanelImage", 0, 0, 600, 150, "assets/resources/images/ui/panel.png"),
    { ...text("guide-overlay-message-text", "MessageText", 35, 20, 530, 110, "", 22, "#3F6555", true), wordWrap: true, leading: 7 }
  ])
]), _$ver: 1 }, "a2000004-4444-4444-8444-000000000004");

write("resources/prefabs/ui/DebugPanel.lh", { ...sprite("debug-root", "DebugPanel", 510, 122, 225, 735, [
  image("debug-panel", "PanelImage", 0, 0, 225, 735, "assets/resources/images/ui/panel_large.png"),
  text("debug-title", "TitleText", 18, 14, 189, 42, "调试面板", 23, "#A64B3F", true),
  button("debug-prev", "PrevButton", 14, 68, 94, 70, "assets/resources/images/ui/button_secondary.png", "上一关", 17),
  button("debug-next", "NextButton", 117, 68, 94, 70, "assets/resources/images/ui/button_secondary.png", "下一关", 17),
  button("debug-win", "WinButton", 14, 150, 94, 70, "assets/resources/images/ui/button_secondary.png", "胜利", 18),
  button("debug-fail", "FailButton", 117, 150, 94, 70, "assets/resources/images/ui/button_secondary.png", "失败", 18),
  button("debug-coin", "CoinButton", 14, 232, 197, 70, "assets/resources/images/ui/button_secondary.png", "金币 +100", 18),
  button("debug-state", "StateButton", 14, 314, 197, 70, "assets/resources/images/ui/button_secondary.png", "显示ID/层级/遮挡", 16),
  button("debug-sequence", "SequenceButton", 14, 396, 197, 70, "assets/resources/images/ui/button_secondary.png", "测试顺子", 18),
  button("debug-special", "SpecialButton", 14, 478, 197, 70, "assets/resources/images/ui/button_secondary.png", "测试中发白", 18),
  button("debug-auto", "AutoButton", 14, 560, 197, 70, "assets/resources/images/ui/button_primary.png", "按规则自动通关", 17),
  text("debug-fps", "FpsText", 14, 652, 197, 32, "FPS显示在左上角", 14, "#71887A")
]), _$ver: 1 }, "a2000005-5555-4555-8555-000000000005");

write("resources/prefabs/ui/SettingsPanel.lh", { ...sprite("settings-root", "SettingsPanel", 55, 237, 640, 860, [
  image("settings-panel", "PanelImage", 0, 0, 640, 860, "assets/resources/images/ui/panel_large.png"),
  text("settings-title", "TitleText", 70, 55, 500, 70, "SETTINGS", 40, "#345D4D", true),
  button("settings-music", "MusicButton", 110, 145, 420, 88, "assets/resources/images/ui/button_secondary.png", "MUSIC: ON", 25),
  button("settings-sound", "SoundButton", 110, 245, 420, 88, "assets/resources/images/ui/button_secondary.png", "SOUND: ON", 25),
  text("settings-language-title", "LanguageTitle", 90, 350, 460, 34, "LANGUAGE", 19, "#71887A"),
  button("settings-language", "LanguageButton", 110, 395, 420, 88, "assets/resources/images/ui/button_secondary.png", "ENGLISH", 25),
  text("settings-language-note", "LanguageNote", 90, 487, 460, 30, "TAP TO CHOOSE, THEN CONFIRM", 16, "#71887A"),
  button("settings-privacy", "PrivacyButton", 110, 535, 420, 88, "assets/resources/images/ui/button_secondary.png", "PRIVACY & TERMS", 22),
  button("settings-confirm", "ConfirmButton", 160, 680, 320, 96, "assets/resources/images/ui/button_primary.png", "CONFIRM", 26)
]), _$ver: 1 }, "a2000006-6666-4666-8666-000000000006");

write("resources/prefabs/ui/LanguagePickerPanel.lh", { ...sprite("language-picker-root", "LanguagePickerPanel", 0, 0, 750, 1334, [
  image("language-picker-panel", "PanelImage", 55, 160, 640, 1030, "assets/resources/images/ui/panel_large.png"),
  text("language-picker-title", "TitleText", 110, 205, 530, 70, "SELECT LANGUAGE", 35, "#345D4D", true),
  button("language-id", "IndonesianButton", 125, 315, 500, 76, "assets/resources/images/ui/button_secondary.png", "Bahasa Indonesia", 23),
  button("language-th", "ThaiButton", 125, 415, 500, 76, "assets/resources/images/ui/button_secondary.png", "ไทย", 23),
  button("language-ja", "JapaneseButton", 125, 515, 500, 76, "assets/resources/images/ui/button_secondary.png", "日本語", 23),
  button("language-fr", "FrenchButton", 125, 615, 500, 76, "assets/resources/images/ui/button_secondary.png", "Français", 23),
  button("language-en", "EnglishButton", 125, 715, 500, 76, "assets/resources/images/ui/button_secondary.png", "English", 23),
  button("language-close", "CloseButton", 215, 855, 320, 88, "assets/resources/images/ui/button_primary.png", "CANCEL", 24)
]), _$ver: 1 }, "a2000020-2020-4020-8020-000000000020");

write("resources/prefabs/ui/PrivacyPanel.lh", { ...sprite("privacy-root", "PrivacyPanel", 0, 0, 750, 1334, [
  image("privacy-panel", "PanelImage", 45, 125, 660, 1080, "assets/resources/images/ui/panel_large.png"),
  text("privacy-title", "TitleText", 85, 165, 580, 70, "PRIVACY & USER AGREEMENT", 35, "#345D4D", true),
  text("privacy-version", "VersionText", 185, 235, 380, 34, "VERSION 1", 17, "#71887A"),
  { ...text("privacy-body", "BodyText", 90, 295, 570, 430, "", 20, "#4D665A"), wordWrap: true, leading: 10, valign: "top", align: "left" },
  text("privacy-note", "NoteText", 100, 735, 550, 62, "PLEASE READ BEFORE CONTINUING", 19, "#A64B3F", true),
  button("privacy-platform", "PlatformPrivacyButton", 125, 815, 500, 88, "assets/resources/images/ui/button_secondary.png", "VIEW PLATFORM PRIVACY GUIDE", 21),
  button("privacy-agree", "AgreeButton", 125, 955, 500, 100, "assets/resources/images/ui/button_primary.png", "CONFIRM", 25)
]), _$ver: 1 }, "a2000011-1111-4111-8111-000000000011");

const shopItems = [
  ["Undo", "UNDO", 100, "assets/resources/images/ui/icon_undo.png"],
  ["Shuffle", "SHUFFLE", 120, "assets/resources/images/ui/icon_shuffle.png"],
  ["Move", "MOVE OUT", 150, "assets/resources/images/ui/icon_move.png"],
  ["Hint", "HINT", 80, "assets/resources/images/ui/icon_hint.png"]
  ,["Freeze", "FREEZE", 130, "assets/resources/images/ui/icon_freeze.png"]
];
const shopChildren = [
  image("shop-panel", "PanelImage", 0, 0, 640, 850, "assets/resources/images/ui/panel_large.png"),
  text("shop-title", "TitleText", 70, 35, 500, 65, "SHOP", 40, "#345D4D", true),
  image("shop-coin-icon", "CoinIcon", 220, 105, 52, 52, "assets/resources/images/ui/icon_coin.png"),
  text("shop-coin-text", "CoinText", 275, 105, 170, 52, "COINS 0", 25, "#496958", true)
];
shopItems.forEach(([name, label, price, icon], index) => {
  const y = 170 + index * 105;
  shopChildren.push(image(`shop-${name}-icon`, `${name}Icon`, 55, y + 14, 78, 78, icon));
  shopChildren.push(text(`shop-${name}-title`, `${name}Title`, 145, y, 180, 48, label, 24, "#3F6555", true));
  shopChildren.push(text(`shop-${name}-count`, `${name}Count`, 145, y + 46, 180, 35, "OWNED 0", 17, "#71887A"));
  shopChildren.push(button(`shop-${name}-info`, `${name}InfoButton`, 335, y + 24, 54, 54, "assets/resources/images/ui/button_secondary.png", "?", 24));
  shopChildren.push(button(`shop-${name}-buy`, `${name}BuyButton`, 400, y + 10, 185, 82, "assets/resources/images/ui/button_secondary.png", `${price} COINS`, 18));
});
shopChildren.push(text("shop-status", "StatusText", 65, 708, 510, 38, "TAP ? TO PREVIEW A PROP", 19, "#A64B3F", true));
shopChildren.push(button("shop-close", "CloseButton", 210, 760, 220, 80, "assets/resources/images/ui/button_primary.png", "CLOSE", 23));
write("resources/prefabs/ui/ShopPanel.lh", { ...sprite("shop-root", "ShopPanel", 55, 235, 640, 850, shopChildren), _$ver: 1 }, "a2000008-8888-4888-8888-000000000008");

write("resources/prefabs/ui/PropGuidePanel.lh", { ...sprite("guide-root", "PropGuidePanel", 0, 0, 640, 850, [
  image("guide-panel", "PanelImage", 0, 0, 640, 850, "assets/resources/images/ui/panel_large.png"),
  text("guide-heading", "HeadingText", 70, 35, 500, 54, "PROP GUIDE", 29, "#71887A", true),
  image("guide-icon", "PropIcon", 276, 98, 88, 88, "assets/resources/images/ui/icon_undo.png"),
  text("guide-title", "TitleText", 70, 190, 500, 58, "UNDO", 34, "#345D4D", true),
  { ...text("guide-description", "DescriptionText", 75, 250, 490, 78, "RETURNS THE LAST SELECTED TILE TO THE BOARD.", 21, "#5F786B"), wordWrap: true, leading: 7 },
  image("guide-demo-panel", "DemoPanel", 70, 345, 500, 280, "assets/resources/images/ui/panel.png"),
  text("guide-demo-label", "DemoLabel", 150, 365, 340, 38, "ANIMATED PREVIEW", 17, "#71887A", true),
  image("guide-slot-1", "Slot1", 107, 493, 92, 122, "assets/resources/images/ui/slot.png"),
  image("guide-slot-2", "Slot2", 274, 493, 92, 122, "assets/resources/images/ui/slot.png"),
  image("guide-slot-3", "Slot3", 441, 493, 92, 122, "assets/resources/images/ui/slot.png"),
  mahjong("guide-tile-1", "DemoTile1", 107, 430, 92, 122, "assets/resources/images/tiles/wan_1.png"),
  mahjong("guide-tile-2", "DemoTile2", 274, 430, 92, 122, "assets/resources/images/tiles/tong_1.png"),
  mahjong("guide-tile-3", "DemoTile3", 441, 430, 92, 122, "assets/resources/images/tiles/tiao_1.png"),
  button("guide-close", "CloseButton", 210, 700, 220, 90, "assets/resources/images/ui/button_primary.png", "GOT IT", 24)
]), _$ver: 1 }, "a2000010-1010-4010-8010-000000000010");

const dailyRewards = [100, 120, 150, 180, 220, 280, 400];
const dailyChildren = [
  image("daily-panel", "PanelImage", 0, 0, 640, 840, "assets/resources/images/ui/panel_large.png"),
  text("daily-title", "TitleText", 70, 28, 500, 60, "DAILY REWARD", 36, "#345D4D", true),
  text("daily-streak", "StreakText", 150, 88, 340, 36, "DAY 1 OF 7", 20, "#A64B3F", true)
];
dailyRewards.forEach((reward, index) => dailyChildren.push(sprite(`daily-day-${index + 1}`, `Day${index + 1}`, 34 + index * 82, 132, 72, 86, [
  image(`daily-day-${index + 1}-bg`, "Background", 0, 0, 72, 86, "assets/resources/images/ui/hud_chip.png"),
  text(`daily-day-${index + 1}-label`, "DayLabel", 0, 5, 72, 26, `D${index + 1}`, 13, "#496958", true),
  text(`daily-day-${index + 1}-reward`, "RewardLabel", 0, 31, 72, 42, String(reward), 14, "#C58B35", true)
])));
dailyChildren.push(image("daily-coin", "CoinIcon", 280, 240, 80, 80, "assets/resources/images/ui/icon_coin.png"));
dailyChildren.push(text("daily-reward", "RewardText", 90, 322, 460, 52, "100 COINS", 30, "#C58B35", true));
dailyChildren.push(image("daily-ad-tip-icon", "DoubleTipIcon", 145, 385, 44, 44, "assets/resources/images/ui/ad_reward_icon.png"));
dailyChildren.push(text("daily-ad-tip", "DoubleTipText", 195, 383, 300, 46, "WATCH AN AD FOR 2X", 19, "#A64B3F", true));
dailyChildren.push(text("daily-status", "StatusText", 70, 435, 500, 44, "YOUR DAILY COINS ARE READY", 17, "#71887A", true));
dailyChildren.push(button("daily-claim", "ClaimButton", 110, 490, 420, 86, "assets/resources/images/ui/button_secondary.png", "CLAIM 100", 24));
dailyChildren.push(sprite("daily-double-claim", "DoubleClaimButton", 110, 595, 420, 94, [
  image("daily-double-button-image", "ButtonImage", 0, 0, 420, 94, "assets/resources/images/ui/button_primary.png"),
  image("daily-double-ad-icon", "AdIcon", 35, 21, 52, 52, "assets/resources/images/ui/ad_reward_icon.png"),
  text("daily-double-label", "Label", 85, 0, 315, 86, "WATCH AD · GET 200", 22, "#FFF9E9", true)
]));
dailyChildren.push(button("daily-close", "CloseButton", 210, 725, 220, 80, "assets/resources/images/ui/button_secondary.png", "CLOSE", 23));
write("resources/prefabs/ui/DailyPanel.lh", { ...sprite("daily-root", "DailyPanel", 55, 245, 640, 840, dailyChildren), _$ver: 1 }, "a2000009-9999-4999-8999-000000000009");

write("resources/prefabs/ui/NoticePanel.lh", { ...sprite("notice-root", "NoticePanel", 55, 405, 640, 420, [
  image("notice-panel", "PanelImage", 0, 0, 640, 420, "assets/resources/images/ui/panel_large.png"),
  text("notice-message", "MessageText", 70, 90, 500, 90, "COMING SOON", 30, "#3F6555", true),
  button("notice-close", "CloseButton", 210, 245, 220, 104, "assets/resources/images/ui/button_primary.png", "GOT IT", 25)
]), _$ver: 1 }, "a2000007-7777-4777-8777-000000000007");

write("resources/prefabs/ui/TaskPanel.lh", { ...sprite("task-root", "TaskPanel", 55, 185, 640, 970, [
  image("task-panel", "PanelImage", 0, 0, 640, 970, "assets/resources/images/ui/panel_large.png"),
  text("task-title", "TitleText", 55, 34, 530, 62, "TASKS & ACHIEVEMENTS", 31, "#345D4D", true),
  button("task-daily", "DailyTab", 55, 112, 250, 76, "assets/resources/images/ui/button_secondary.png", "DAILY TASKS", 19),
  button("task-achievement", "AchievementTab", 335, 112, 250, 76, "assets/resources/images/ui/button_secondary.png", "ACHIEVEMENTS", 19),
  sprite("task-list", "ListLayer", 40, 215, 560, 580),
  button("task-prev", "PrevPageButton", 145, 785, 110, 58, "assets/resources/images/ui/button_secondary.png", "‹", 28),
  text("task-page", "PageText", 270, 790, 100, 45, "1 / 1", 18, "#496958", true),
  button("task-next", "NextPageButton", 385, 785, 110, 58, "assets/resources/images/ui/button_secondary.png", "›", 28),
  text("task-status", "StatusText", 70, 840, 500, 38, "", 18, "#A64B3F", true),
  button("task-close", "CloseButton", 210, 885, 220, 70, "assets/resources/images/ui/button_primary.png", "CLOSE", 21)
]), _$ver: 1 }, "a2000012-1212-4212-8212-000000000012");

write("resources/prefabs/ui/TaskRow.lh", { ...sprite("task-row", "TaskRow", 0, 0, 560, 104, [
  image("task-row-panel", "PanelImage", 0, 0, 560, 104, "assets/resources/images/ui/panel.png"),
  text("task-row-title", "TitleText", 18, 9, 280, 35, "TASK", 18, "#3F6555", true),
  image("task-row-progress-back", "ProgressBack", 22, 59, 190, 18, "assets/resources/images/ui/hud_chip.png"),
  image("task-row-progress", "ProgressFill", 22, 59, 95, 18, "assets/resources/images/ui/button_primary.png"),
  text("task-row-progress-text", "ProgressText", 214, 48, 82, 42, "0 / 1", 16, "#71887A", true),
  image("task-row-coin", "CoinIcon", 300, 13, 38, 38, "assets/resources/images/ui/icon_coin.png"),
  text("task-row-reward", "RewardText", 335, 11, 80, 40, "+50", 18, "#C58B35", true),
  button("task-row-claim", "ClaimButton", 408, 17, 135, 70, "assets/resources/images/ui/button_secondary.png", "CLAIM", 16)
]), _$ver: 1 }, "a2000013-1313-4313-8313-000000000013");

write("resources/prefabs/ui/ChallengePanel.lh", { ...sprite("challenge-root", "ChallengePanel", 55, 260, 640, 800, [
  image("challenge-panel", "PanelImage", 0, 0, 640, 800, "assets/resources/images/ui/panel_large.png"),
  text("challenge-title", "TitleText", 70, 35, 500, 62, "DAILY CHALLENGE", 35, "#345D4D", true),
  text("challenge-date", "DateText", 140, 98, 360, 38, "2026/9/1", 18, "#71887A", true),
  image("challenge-preview", "PreviewPanel", 80, 155, 480, 250, "assets/resources/images/ui/panel.png"),
  mahjong("challenge-tile-1", "PreviewTile1", 165, 218, 86, 114, "assets/resources/images/tiles/wan_1.png"),
  mahjong("challenge-tile-2", "PreviewTile2", 277, 192, 86, 114, "assets/resources/images/tiles/tong_1.png"),
  mahjong("challenge-tile-3", "PreviewTile3", 389, 218, 86, 114, "assets/resources/images/tiles/tiao_1.png"),
  text("challenge-level", "LevelText", 70, 430, 500, 54, "SPECIAL LAYOUT · LEVEL 1", 24, "#3F6555", true),
  image("challenge-coin", "CoinIcon", 225, 497, 52, 52, "assets/resources/images/ui/icon_coin.png"),
  text("challenge-reward", "RewardText", 275, 496, 150, 52, "250 COINS", 24, "#C58B35", true),
  text("challenge-status", "StatusText", 70, 565, 500, 42, "COMPLETE ONCE TO EARN THE REWARD", 17, "#A64B3F", true),
  button("challenge-start", "StartButton", 110, 625, 420, 90, "assets/resources/images/ui/button_primary.png", "START CHALLENGE", 23),
  button("challenge-close", "CloseButton", 220, 725, 200, 64, "assets/resources/images/ui/button_secondary.png", "CLOSE", 20)
]), _$ver: 1 }, "a2000014-1414-4414-8414-000000000014");

const themeChildren = [
  image("theme-panel", "PanelImage", 0, 0, 640, 900, "assets/resources/images/ui/panel_large.png"),
  text("theme-title", "TitleText", 70, 28, 500, 62, "DECORATIONS & BUFFS", 32, "#345D4D", true),
  image("theme-coin", "CoinIcon", 225, 94, 44, 44, "assets/resources/images/ui/icon_coin.png"),
  text("theme-coins", "CoinText", 270, 94, 160, 44, "COINS 0", 21, "#496958", true)
];
for (let index = 0; index < 3; index++) {
  const y = 155 + index * 205, id = `theme-${index + 1}`;
  themeChildren.push(sprite(id, `Theme${index + 1}`, 45, y, 550, 182, [
    image(`${id}-panel`, "CardPanel", 0, 0, 550, 182, "assets/resources/images/ui/panel.png"),
    image(`${id}-background`, "PreviewBackground", 18, 20, 150, 140, "assets/resources/images/background/game_bg.png"),
    mahjong(`${id}-tile`, "PreviewTile", 49, 29, 76, 101, "assets/resources/images/tiles/wan_1.png"),
    text(`${id}-title`, "TitleText", 185, 24, 180, 52, `THEME ${index + 1}`, 24, "#3F6555", true),
    button(`${id}-select`, "SelectButton", 355, 50, 175, 78, "assets/resources/images/ui/button_secondary.png", index ? "400 COINS" : "SELECTED", 17)
  ]));
}
themeChildren.push(text("theme-status", "StatusText", 70, 778, 500, 36, "", 18, "#A64B3F", true));
themeChildren.push(button("theme-close", "CloseButton", 210, 820, 220, 70, "assets/resources/images/ui/button_primary.png", "CLOSE", 21));
write("resources/prefabs/ui/ThemePanel.lh", { ...sprite("theme-root", "ThemePanel", 55, 215, 640, 900, themeChildren), _$ver: 1 }, "a2000015-1515-4515-8515-000000000015");

console.log("Generated scenes and UI/game prefabs");
