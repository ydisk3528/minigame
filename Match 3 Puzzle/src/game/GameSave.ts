export interface SaveData {
    highestCompleted: number;
    highScores: Record<string, number>;
    musicEnabled: boolean;
    soundEnabled: boolean;
    tutorialCompleted: boolean;
}

interface CocosJavaBridge {
    getGameSave?: () => string;
    setGameSave?: (json: string) => void;
    showBanner?: () => void;
    hideBanner?: () => void;
    vibrate?: (durationMs: number) => void;
    showVideo?: () => void;
}

interface RewardCallbackWindow extends Window {
    onReward?: () => void;
    onAdClosed?: () => void;
    onAdFailed?: (message?: string) => void;
}

const SAVE_KEY = "crystal-match-save-v1";
const LEGACY_COMPLETED_KEY = "crystal-match-highest-completed";

function javaBridge(): CocosJavaBridge | undefined {
    return (window as unknown as { cocosJava?: CocosJavaBridge }).cocosJava;
}

export class GameSave {
    private static data: SaveData;

    public static initialize(): void {
        this.data = this.read();
        this.write();
    }

    public static highestCompleted(): number {
        return this.data.highestCompleted;
    }

    public static highScore(level: number): number {
        return this.data.highScores[String(level)] ?? 0;
    }

    public static completeLevel(level: number, score: number): void {
        this.data.highestCompleted = Math.max(this.data.highestCompleted, Math.floor(level));
        const key = String(level);
        this.data.highScores[key] = Math.max(this.data.highScores[key] ?? 0, Math.floor(score));
        this.write();
    }

    public static musicEnabled(): boolean {
        return this.data.musicEnabled;
    }

    public static soundEnabled(): boolean {
        return this.data.soundEnabled;
    }

    public static setMusicEnabled(enabled: boolean): void {
        this.data.musicEnabled = enabled;
        this.write();
    }

    public static setSoundEnabled(enabled: boolean): void {
        this.data.soundEnabled = enabled;
        this.write();
    }

    public static tutorialCompleted(): boolean {
        return this.data.tutorialCompleted;
    }

    public static setTutorialCompleted(): void {
        this.data.tutorialCompleted = true;
        this.write();
    }

    public static showBanner(): void {
        this.callJava("showBanner");
    }

    public static hideBanner(): void {
        this.callJava("hideBanner");
    }

    public static vibrate(durationMs: number): void {
        const duration = Math.max(1, Math.min(500, Math.floor(durationMs)));
        try {
            const bridge = javaBridge();
            if (bridge?.vibrate) {
                bridge.vibrate(duration);
                return;
            }
        } catch (error) {
            console.warn("Android bridge call failed: vibrate", error);
        }
        if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(duration);
    }

    public static showRewardVideo(): Promise<boolean> {
        const bridge = javaBridge();
        const debugMock = typeof location !== "undefined"
            && new URLSearchParams(location.search).get("debug") === "1";
        if (!bridge?.showVideo && !debugMock) return Promise.resolve(false);
        return new Promise((resolve) => {
            const scope = window as RewardCallbackWindow;
            const previous = [scope.onReward, scope.onAdClosed, scope.onAdFailed] as const;
            let completed = false;
            // A rewarded video can easily exceed 20 seconds. Keep the callbacks alive
            // until playback has had enough time to finish and Java reports the reward.
            const timeout = window.setTimeout(() => finish(false), 120000);
            const finish = (rewarded: boolean): void => {
                if (completed) return;
                completed = true;
                window.clearTimeout(timeout);
                [scope.onReward, scope.onAdClosed, scope.onAdFailed] = previous;
                resolve(rewarded);
            };
            scope.onReward = () => finish(true);
            scope.onAdClosed = () => finish(false);
            scope.onAdFailed = () => finish(false);
            try {
                bridge?.showVideo?.();
            } catch (error) {
                console.warn("Android bridge call failed: showVideo", error);
                finish(false);
            }
        });
    }

    public static debugResolveRewardVideo(rewarded: boolean): void {
        const scope = window as RewardCallbackWindow;
        if (rewarded) scope.onReward?.();
        else scope.onAdFailed?.("Debug ad failure");
    }

    public static selfCheck(): void {
        const normalized = this.normalize({ highestCompleted: 2.9, highScores: { "2": 123.8 }, musicEnabled: false });
        if (normalized.highestCompleted !== 2 || normalized.highScores["2"] !== 123
            || normalized.musicEnabled !== false || normalized.soundEnabled !== true
            || normalized.tutorialCompleted !== false) {
            throw new Error("GameSave self-check failed.");
        }
    }

    private static read(): SaveData {
        let raw = "";
        try {
            raw = javaBridge()?.getGameSave?.() ?? "";
        } catch (error) {
            console.warn("Unable to read Android game save; using Web storage.", error);
        }
        raw ||= Laya.LocalStorage.getItem(SAVE_KEY) ?? "";
        if (raw) {
            try {
                return this.normalize(JSON.parse(raw));
            } catch (error) {
                console.warn("Ignoring invalid game save.", error);
            }
        }
        const legacy = Number(Laya.LocalStorage.getItem(LEGACY_COMPLETED_KEY) ?? 0);
        return this.normalize({ highestCompleted: legacy });
    }

    private static normalize(value: Partial<SaveData> | null): SaveData {
        const source = value ?? {};
        const highScores: Record<string, number> = {};
        for (const [level, score] of Object.entries(source.highScores ?? {})) {
            const number = Number(score);
            if (/^[1-9]\d*$/.test(level) && Number.isFinite(number) && number >= 0) {
                highScores[level] = Math.floor(number);
            }
        }
        const completed = Number(source.highestCompleted ?? 0);
        return {
            highestCompleted: Number.isFinite(completed) ? Math.max(0, Math.floor(completed)) : 0,
            highScores,
            musicEnabled: source.musicEnabled !== false,
            soundEnabled: source.soundEnabled !== false,
            tutorialCompleted: source.tutorialCompleted === true,
        };
    }

    private static write(): void {
        const json = JSON.stringify(this.data);
        Laya.LocalStorage.setItem(SAVE_KEY, json);
        try {
            javaBridge()?.setGameSave?.(json);
        } catch (error) {
            console.warn("Unable to write Android game save; Web storage remains available.", error);
        }
    }

    private static callJava(method: "showBanner" | "hideBanner"): void {
        try {
            javaBridge()?.[method]?.();
        } catch (error) {
            console.warn(`Android bridge call failed: ${method}`, error);
        }
    }
}
