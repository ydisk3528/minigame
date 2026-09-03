export interface TaskStats {
    levelsCompleted: number; starsEarned: number; matches: number; bestCombo: number;
    propsUsed: { undo: number; shuffle: number; move: number; hint: number; freeze: number };
}
export type SavedLanguage = "" | "en" | "id" | "th" | "ja" | "fr";
export interface SaveData {
    highestCompleted: number; coins: number; musicEnabled: boolean; soundEnabled: boolean; language: SavedLanguage;
    dailyClaimDate: string; dailyStreak: number; privacyAcceptedVersion: string;
    guideVersion: number; guideStep: number; guideProgress: number;
    dailyChallengeClaimDate: string; selectedTheme: string; unlockedThemes: string[];
    stats: TaskStats; dailyStatsDate: string; dailyStats: TaskStats; dailyTaskClaims: string[]; achievementClaims: string[];
    stars: Record<string, number>;
    props: { undo: number; shuffle: number; move: number; hint: number; freeze: number };
}
interface JavaBridge { getGameSave?: () => string; setGameSave?: (json: string) => void; }
const SAVE_KEY = "mahjong_triple_quest_save_v1";
const DAILY_REWARDS = [100, 120, 150, 180, 220, 280, 400];
const PRIVACY_VERSION = "1";
const emptyStats = (): TaskStats => ({ levelsCompleted: 0, starsEarned: 0, matches: 0, bestCombo: 0, propsUsed: { undo: 0, shuffle: 0, move: 0, hint: 0, freeze: 0 } });
const defaults = (): SaveData => ({ highestCompleted: 0, coins: 0, musicEnabled: true, soundEnabled: true, language: "", dailyClaimDate: "", dailyStreak: 0, privacyAcceptedVersion: "", guideVersion: 0, guideStep: 0, guideProgress: 0, dailyChallengeClaimDate: "", selectedTheme: "classic", unlockedThemes: ["classic"], stats: emptyStats(), dailyStatsDate: "", dailyStats: emptyStats(), dailyTaskClaims: [], achievementClaims: [], stars: {}, props: { undo: 0, shuffle: 0, move: 0, hint: 0, freeze: 0 } });
function bridge(): JavaBridge | undefined { return (window as unknown as { cocosJava?: JavaBridge }).cocosJava; }
function today(): string { const date = new Date(); return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`; }
function dayNumber(value: string): number { const [year, month, day] = value.split("-").map(Number); return Date.UTC(year, month - 1, day) / 86400000; }

export class MahjongSave {
    private static data: SaveData;
    public static initialize(): void { this.data = this.read(); this.ensureDailyStats(); this.write(); }
    public static highestCompleted(): number { return this.data.highestCompleted; }
    public static stars(level: number): number { return this.data.stars[String(level)] ?? (level <= this.data.highestCompleted ? 1 : 0); }
    public static coins(): number { return this.data.coins; }
    public static musicEnabled(): boolean { return this.data.musicEnabled; }
    public static soundEnabled(): boolean { return this.data.soundEnabled; }
    public static language(): SavedLanguage { return this.data.language; }
    public static privacyAccepted(): boolean { return this.data.privacyAcceptedVersion === PRIVACY_VERSION; }
    public static guideVersion(): number { return this.data.guideVersion; }
    public static guideStep(): number { return this.data.guideStep; }
    public static guideProgress(): number { return this.data.guideProgress; }
    public static dailyChallengeCompleted(): boolean { return this.data.dailyChallengeClaimDate === today(); }
    public static selectedTheme(): string { return this.data.selectedTheme; }
    public static themeUnlocked(id: string): boolean { return this.data.unlockedThemes.includes(id); }
    public static prop(type: keyof SaveData["props"]): number { return this.data.props[type]; }
    public static useProp(type: keyof SaveData["props"]): boolean { if (this.data.props[type] <= 0) return false; this.data.props[type]--; this.write(); return true; }
    public static addProp(type: keyof SaveData["props"]): void { this.data.props[type]++; this.write(); }
    public static buyProp(type: keyof SaveData["props"], price: number): boolean { price = Math.max(0, Math.floor(price)); if (this.data.coins < price) return false; this.data.coins -= price; this.data.props[type]++; this.write(); return true; }
    public static canClaimDaily(): boolean { return this.data.dailyClaimDate !== today(); }
    public static dailyDay(): number {
        if (!this.canClaimDaily()) return Math.max(1, this.data.dailyStreak);
        return this.data.dailyClaimDate && dayNumber(today()) - dayNumber(this.data.dailyClaimDate) === 1 ? this.data.dailyStreak % 7 + 1 : 1;
    }
    public static dailyReward(day = this.dailyDay()): number { return DAILY_REWARDS[Math.max(0, Math.min(6, Math.floor(day) - 1))]; }
    public static dailyRewards(): readonly number[] { return DAILY_REWARDS; }
    public static claimDailyReward(multiplier = 1): number {
        if (!this.canClaimDaily()) return 0;
        const day = this.dailyDay(), amount = this.dailyReward(day) * Math.max(1, Math.min(2, Math.floor(multiplier)));
        this.data.dailyClaimDate = today(); this.data.dailyStreak = day; this.data.coins += amount; this.write(); return amount;
    }
    public static completeLevel(level: number, reward: number, stars: number): void { const key = String(Math.floor(level)); this.data.highestCompleted = Math.max(this.data.highestCompleted, Math.floor(level)); this.data.stars[key] = Math.max(this.data.stars[key] ?? 0, Math.max(1, Math.min(3, Math.floor(stars)))); this.data.coins += Math.max(0, Math.floor(reward)); this.recordLevel(stars); this.write(); }
    public static completeDailyChallenge(reward: number, stars: number): number { if (this.dailyChallengeCompleted()) return 0; const amount = Math.max(0, Math.floor(reward)); this.data.dailyChallengeClaimDate = today(); this.data.coins += amount; this.recordLevel(stars); this.write(); return amount; }
    public static addCoins(amount: number): void { this.data.coins += Math.max(0, Math.floor(amount)); this.write(); }
    public static resetGuide(version: number): void { this.data.guideVersion = Math.max(0, Math.floor(version)); this.data.guideStep = 0; this.data.guideProgress = 0; this.write(); }
    public static setGuideState(step: number, progress: number, version: number): void { this.data.guideVersion = Math.max(0, Math.floor(version)); this.data.guideStep = Math.max(0, Math.floor(step)); this.data.guideProgress = Math.max(0, Math.floor(progress)); this.write(); }
    public static setMusicEnabled(enabled: boolean): void { this.data.musicEnabled = enabled; this.write(); }
    public static setSoundEnabled(enabled: boolean): void { this.data.soundEnabled = enabled; this.write(); }
    public static setLanguage(language: SavedLanguage): void { this.data.language = language; this.write(); }
    public static acceptPrivacy(): void { this.data.privacyAcceptedVersion = PRIVACY_VERSION; this.write(); }
    public static recordMatch(combo: number): void { this.ensureDailyStats(); for (const stats of [this.data.stats, this.data.dailyStats]) { stats.matches++; stats.bestCombo = Math.max(stats.bestCombo, Math.floor(combo)); } this.write(); }
    public static recordProp(type: keyof SaveData["props"]): void { this.ensureDailyStats(); this.data.stats.propsUsed[type]++; this.data.dailyStats.propsUsed[type]++; this.write(); }
    public static taskProgress(type: string, prop: keyof SaveData["props"] | undefined, daily: boolean): number {
        this.ensureDailyStats(); const stats = daily ? this.data.dailyStats : this.data.stats;
        if (type === "complete_levels") return stats.levelsCompleted;
        if (type === "earn_stars") return stats.starsEarned;
        if (type === "matches") return stats.matches;
        if (type === "best_combo") return stats.bestCombo;
        if (type === "use_prop") return prop ? stats.propsUsed[prop] : stats.propsUsed.undo + stats.propsUsed.shuffle + stats.propsUsed.move + stats.propsUsed.hint + stats.propsUsed.freeze;
        return 0;
    }
    public static taskClaimed(id: string, daily: boolean): boolean { this.ensureDailyStats(); return (daily ? this.data.dailyTaskClaims : this.data.achievementClaims).includes(id); }
    public static claimTask(id: string, reward: number, daily: boolean): boolean { this.ensureDailyStats(); const claims = daily ? this.data.dailyTaskClaims : this.data.achievementClaims; if (claims.includes(id)) return false; claims.push(id); this.data.coins += Math.max(0, Math.floor(reward)); this.write(); return true; }
    public static unlockTheme(id: string, cost: number): boolean { if (this.themeUnlocked(id)) return true; cost = Math.max(0, Math.floor(cost)); if (this.data.coins < cost) return false; this.data.coins -= cost; this.data.unlockedThemes.push(id); this.write(); return true; }
    public static grantTheme(id: string): void { if (!this.themeUnlocked(id)) { this.data.unlockedThemes.push(id); this.write(); } }
    public static selectTheme(id: string): void { if (this.themeUnlocked(id)) { this.data.selectedTheme = id; this.write(); } }
    public static selfCheck(): void {
        const value = this.normalize({ highestCompleted: 2.8, coins: 9.9, language: "th" } as SaveData);
        if (value.highestCompleted !== 2 || value.coins !== 9 || value.language !== "th" || value.props.undo !== 0 || value.dailyClaimDate !== "" || value.dailyStreak !== 0 || value.privacyAcceptedVersion !== "" || value.selectedTheme !== "classic" || Object.keys(value.stars).length) throw new Error("MahjongSave self-check failed");
    }
    private static read(): SaveData {
        let raw = "";
        try { raw = bridge()?.getGameSave?.() ?? ""; } catch (error) { console.warn("Java save read failed; using local save", error); }
        raw ||= Laya.LocalStorage.getItem(SAVE_KEY) ?? "";
        if (raw) try { return this.normalize(JSON.parse(raw)); } catch (error) { console.warn("Ignoring corrupted save", error); }
        return defaults();
    }
    private static normalize(value: Partial<SaveData>): SaveData {
        const base = defaults();
        const stars: Record<string, number> = {};
        for (const level in value.stars ?? {}) if (/^[1-9]\d*$/.test(level)) stars[level] = Math.max(0, Math.min(3, Math.floor(Number(value.stars![level]) || 0)));
        const dailyClaimDate = /^\d{4}-\d{1,2}-\d{1,2}$/.test(value.dailyClaimDate ?? "") ? value.dailyClaimDate! : "";
        const normalizeStats = (stats?: Partial<TaskStats>): TaskStats => ({ levelsCompleted: Math.max(0, Math.floor(Number(stats?.levelsCompleted) || 0)), starsEarned: Math.max(0, Math.floor(Number(stats?.starsEarned) || 0)), matches: Math.max(0, Math.floor(Number(stats?.matches) || 0)), bestCombo: Math.max(0, Math.floor(Number(stats?.bestCombo) || 0)), propsUsed: { undo: Math.max(0, Math.floor(Number(stats?.propsUsed?.undo) || 0)), shuffle: Math.max(0, Math.floor(Number(stats?.propsUsed?.shuffle) || 0)), move: Math.max(0, Math.floor(Number(stats?.propsUsed?.move) || 0)), hint: Math.max(0, Math.floor(Number(stats?.propsUsed?.hint) || 0)), freeze: Math.max(0, Math.floor(Number(stats?.propsUsed?.freeze) || 0)) } });
        const cleanIds = (items?: string[]): string[] => [...new Set((items ?? []).filter(item => typeof item === "string" && /^[a-z0-9_-]+$/i.test(item)))];
        const unlockedThemes = cleanIds(value.unlockedThemes); if (!unlockedThemes.includes("classic")) unlockedThemes.unshift("classic");
        const supportedLanguages: SavedLanguage[] = ["en", "id", "th", "ja", "fr"];
        const language: SavedLanguage = supportedLanguages.indexOf(value.language ?? "") >= 0 ? value.language! : "";
        return { highestCompleted: Math.max(0, Math.floor(Number(value.highestCompleted) || 0)), coins: Math.max(0, Math.floor(Number(value.coins) || 0)), musicEnabled: value.musicEnabled !== false, soundEnabled: value.soundEnabled !== false, language, dailyClaimDate, dailyStreak: dailyClaimDate ? Math.max(1, Math.min(7, Math.floor(Number(value.dailyStreak) || 1))) : 0, privacyAcceptedVersion: value.privacyAcceptedVersion === PRIVACY_VERSION ? PRIVACY_VERSION : "", guideVersion: Math.max(0, Math.floor(Number(value.guideVersion) || 0)), guideStep: Math.max(0, Math.floor(Number(value.guideStep) || 0)), guideProgress: Math.max(0, Math.floor(Number(value.guideProgress) || 0)), dailyChallengeClaimDate: /^\d{4}-\d{1,2}-\d{1,2}$/.test(value.dailyChallengeClaimDate ?? "") ? value.dailyChallengeClaimDate! : "", selectedTheme: typeof value.selectedTheme === "string" ? value.selectedTheme : "classic", unlockedThemes, stats: normalizeStats(value.stats), dailyStatsDate: /^\d{4}-\d{1,2}-\d{1,2}$/.test(value.dailyStatsDate ?? "") ? value.dailyStatsDate! : "", dailyStats: normalizeStats(value.dailyStats), dailyTaskClaims: cleanIds(value.dailyTaskClaims), achievementClaims: cleanIds(value.achievementClaims),
            stars,
            props: { undo: Math.max(0, Math.floor(Number(value.props?.undo ?? base.props.undo))), shuffle: Math.max(0, Math.floor(Number(value.props?.shuffle ?? base.props.shuffle))), move: Math.max(0, Math.floor(Number(value.props?.move ?? base.props.move))), hint: Math.max(0, Math.floor(Number(value.props?.hint ?? base.props.hint))), freeze: Math.max(0, Math.floor(Number(value.props?.freeze ?? base.props.freeze))) } };
    }
    private static ensureDailyStats(): void { if (this.data.dailyStatsDate === today()) return; this.data.dailyStatsDate = today(); this.data.dailyStats = emptyStats(); this.data.dailyTaskClaims = []; }
    private static recordLevel(stars: number): void { this.ensureDailyStats(); for (const stats of [this.data.stats, this.data.dailyStats]) { stats.levelsCompleted++; stats.starsEarned += Math.max(1, Math.min(3, Math.floor(stars))); } }
    private static write(): void {
        const json = JSON.stringify(this.data); Laya.LocalStorage.setItem(SAVE_KEY, json);
        try { bridge()?.setGameSave?.(json); } catch (error) { console.warn("Java save write failed; local save remains valid", error); }
    }
}
