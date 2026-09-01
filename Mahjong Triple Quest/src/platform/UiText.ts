import { GamePlatform } from "./GamePlatform";

let englishOverride = false;

const ZH: Record<string, string> = {
    "Mahjong Triple Quest": "麻将三消奇旅",
    "MAHJONG": "麻将", "TRIPLE QUEST": "三消奇旅", "PICK · SLOT · MATCH": "选牌 · 入槽 · 消除",
    "PLAY": "开始游戏", "SETTINGS": "设置", "SHOP": "商店", "DAILY": "签到", "SHARE": "分享",
    "TASKS": "任务", "CHALLENGE": "每日挑战", "THEMES": "主题", "DECOR": "装饰",
    "LEVEL": "关卡", "COINS": "金币", "OWNED": "拥有", "CLAIM": "领取", "WATCH AD · GET": "看广告领取",
    "DAY": "第", "COMPLETE": "天已完成", "COMBO": "连消",
    "CLEAR EVERY MAHJONG STACK": "消除所有麻将牌", "SELECT LEVEL": "选择关卡",
    "CLEAR THIS LEVEL TO UNLOCK THE NEXT": "通关后解锁下一关", "SCORE": "得分",
    "TIME": "时间", "MOVES": "步数", "TIME UP": "时间结束", "OUT OF MOVES": "步数用完",
    "UNDO": "撤回", "SHUFFLE": "洗牌", "MOVE OUT": "移出", "HINT": "提示",
    "CURRENT": "当前", "COMPLETED": "已完成", "LOCKED": "未解锁",
    "LEVEL COMPLETE": "闯关成功", "NO SPACE": "槽位已满", "NEXT LEVEL": "下一关",
    "RESTART": "重新开始", "LEVEL SELECT": "选择关卡", "NO MORE CONTINUES": "已无复活机会",
    "WATCH AD · CONTINUE": "看广告继续", "CLOSE": "关闭", "MUSIC AND SOUND": "音乐与音效",
    "WATCH AD · +2 MOVES": "看广告恢复 2 步", "WATCH AD · +30 SECONDS": "看广告恢复 30 秒",
    "MUSIC: ON": "音乐：开", "MUSIC: OFF": "音乐：关", "SOUND: ON": "音效：开", "SOUND: OFF": "音效：关",
    "OWNED 0": "拥有 0", "DAILY REWARD": "每日签到", "WATCH AN AD FOR 2X": "看广告奖励翻倍",
    "YOUR DAILY COINS ARE READY": "今日金币可以领取", "COMING SOON": "敬请期待", "GOT IT": "知道了",
    "CLAIMED TODAY": "今日已领取", "COME BACK TOMORROW": "明天再来吧", "PLAYING REWARDED AD...": "正在播放广告…",
    "WATCH THE FULL AD TO GET 2X": "看完广告即可获得双倍奖励", "NOT ENOUGH COINS": "金币不足",
    "SPECIAL DRAGONS": "中发白消除", "SEQUENCE": "顺子消除", "MATCH 3": "三张消除", "FREE PROP +1": "免费道具 +1",
    "NO SPACE. TRY AGAIN": "槽位已满，请重试", "LOADING REWARDED AD...": "正在加载广告…",
    "TIME UP. TRY AGAIN": "时间已结束，请重试", "OUT OF MOVES. TRY AGAIN": "步数已用完，请重试",
    "AD NOT AVAILABLE. TRY AGAIN": "广告暂不可用，请重试", "CONTINUE": "继续游戏",
    "TAP A FREE TILE": "点击未被遮挡的牌", "TAP TWO MORE MATCHING TILES": "再点击两张相同的牌",
    "THREE MATCHING TILES CLEAR AUTOMATICALLY": "三张相同的牌会自动消除", "MATCH COMPLETE! ONLY 7 SLOTS": "消除成功！槽位只有 7 个",
    "UNDO +1": "撤回 +1", "SHUFFLE +1": "洗牌 +1", "MOVE +1": "移出 +1", "HINT +1": "提示 +1",
    "FREEZE +1": "冻结 +1",
    "TAP ? TO PREVIEW A PROP": "点击 ? 查看道具作用", "PROP GUIDE": "道具说明", "ANIMATED PREVIEW": "动态效果演示",
    "RETURNS THE LAST SELECTED TILE TO THE BOARD.": "将最近选择的一张牌撤回到牌堆。",
    "REARRANGES ALL REMAINING TILES ON THE BOARD.": "重新排列牌堆中所有剩余麻将牌。",
    "MOVES UP TO THREE SLOT TILES TO A TEMPORARY AREA.": "将槽位中的最多三张牌暂时移出。",
    "HIGHLIGHTS TILES THAT CAN FORM A MATCH.": "高亮提示可以组成消除的麻将牌。",
    "PRIVACY & TERMS": "隐私与协议", "PRIVACY & USER AGREEMENT": "隐私政策与用户协议", "VERSION 1": "版本 1",
    "PLEASE READ BEFORE CONTINUING": "继续游戏前请阅读并确认", "YOU CAN REVIEW THIS AGREEMENT AT ANY TIME": "你可以随时查看本协议",
    "VIEW PLATFORM PRIVACY GUIDE": "查看平台隐私保护指引", "CONFIRM": "确定",
    "LANGUAGE": "语言", "ENGLISH · SELECTED": "英文 · 已选择", "SELECT ENGLISH, THEN CONFIRM": "选择英文后点击确定",
    "CONSENT IS REQUIRED TO CONTINUE. CLOSE THE GAME TO EXIT.": "需要同意协议后才能继续，请关闭游戏退出。",
    "TASKS & ACHIEVEMENTS": "任务与成就", "DAILY TASKS": "每日任务", "ACHIEVEMENTS": "成就",
    "CLAIMED": "已领取", "IN PROGRESS": "进行中", "REWARD COLLECTED": "奖励已领取",
    "DAILY CHALLENGE": "每日挑战", "CHALLENGE COMPLETE": "挑战完成", "SPECIAL LAYOUT": "特殊布局",
    "TODAY'S REWARD COLLECTED": "今日奖励已领取", "COMPLETE ONCE TO EARN THE REWARD": "今日首次完成可领取奖励",
    "PLAY AGAIN": "再次挑战", "START CHALLENGE": "开始挑战", "HOME": "返回主页",
    "SELECTED": "已选择", "SELECT": "选择", "THEME SELECTED": "主题已启用",
    "DECORATIONS & BUFFS": "装饰与增益", "ACHIEVEMENT REWARD": "成就奖励", "UNLOCKED BY ACHIEVEMENT": "完成对应成就后解锁",
    "FREEZE": "冻结", "TIME LEVELS ONLY": "仅倒计时关卡可用", "TIME FROZEN · 20S": "时间冻结 20 秒",
    "FREEZES THE LEVEL TIMER FOR 20 SECONDS.": "冻结关卡倒计时 20 秒。",
    "NEXT": "下一步", "START PLAYING": "开始闯关",
};

export function uiText(english: string): string {
    if (usesEnglishUi()) return english;
    const exact = ZH[english];
    if (exact) return exact;
    let match = english.match(/^LEVEL (\d+)$/); if (match) return `关卡 ${match[1]}`;
    match = english.match(/^COINS (\d+)$/); if (match) return `金币 ${match[1]}`;
    match = english.match(/^OWNED (\d+)$/); if (match) return `拥有 ${match[1]}`;
    match = english.match(/^(\d+) COINS$/); if (match) return `${match[1]} 金币`;
    match = english.match(/^D(\d+)$/); if (match) return `第${match[1]}天`;
    match = english.match(/^DAY (\d+) OF 7$/); if (match) return `第 ${match[1]} / 7 天`;
    match = english.match(/^CLAIM (\d+)$/); if (match) return `领取 ${match[1]}`;
    match = english.match(/^WATCH AD · GET (\d+)$/); if (match) return `看广告领取 ${match[1]}`;
    return english;
}

export function setEnglishUi(enabled: boolean): void { englishOverride = enabled; }

export function usesEnglishUi(): boolean { return englishOverride || GamePlatform.platformName() === "android"; }

export function localizeTree(root: Laya.Node): void {
    if (usesEnglishUi() || root.name === "DebugPanel") return;
    if (root instanceof Laya.GTextField) root.text = uiText(root.text);
    for (let index = 0; index < root.numChildren; index++) localizeTree(root.getChildAt(index));
}
