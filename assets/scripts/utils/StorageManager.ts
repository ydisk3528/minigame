import { EventTarget, sys } from 'cc';

export interface SaveData {
    bestScore: number;
    coin: number;
    level: number;
    levelStars: Record<string, number>;
    claimedLevelRewards: Record<string, boolean>;
    claimedLevelAdRewards: Record<string, boolean>;
    tutorials: {
        playCompleted: boolean;
        matchCompleted: boolean;
        boosterCompleted: boolean;
    };
    settings: {
        musicEnabled: boolean;
        effectsEnabled: boolean;
    };
    starterBoostersGranted: boolean;
    boosters: {
        bomb: number;
        hammer: number;
        rainbow: number;
    };
    buffs: {
        luckUntil: number;
        freeGiftUntil: number;
        freeGiftClaimed: boolean;
    };
}

export type TimedBuffType = 'luck' | 'freeGift';
export type StoredBoosterType = keyof SaveData['boosters'];

const STORAGE_KEY = 'block_blast_save_v1';
const STORAGE_CHANGED_EVENT = 'storage-changed';

interface CocosJavaStorageBridge {
    getStorage?: (key: string) => string | null;
    setStorage?: (key: string, value: string) => boolean;
    removeStorage?: (key: string) => boolean;
}

interface NativeStorageWindow {
    cocosJava?: CocosJavaStorageBridge;
}

const DEFAULT_SAVE_DATA: Readonly<SaveData> = Object.freeze({
    bestScore: 0,
    coin: 0,
    level: 1,
    levelStars: Object.freeze({}),
    claimedLevelRewards: Object.freeze({}),
    claimedLevelAdRewards: Object.freeze({}),
    tutorials: Object.freeze({
        playCompleted: false,
        matchCompleted: false,
        boosterCompleted: false,
    }),
    settings: Object.freeze({
        musicEnabled: true,
        effectsEnabled: true,
    }),
    starterBoostersGranted: false,
    boosters: Object.freeze({
        bomb: 0,
        hammer: 0,
        rainbow: 0,
    }),
    buffs: Object.freeze({
        luckUntil: 0,
        freeGiftUntil: 0,
        freeGiftClaimed: false,
    }),
});

export class StorageManager {
    public static readonly BUFF_DURATION_MS = 10 * 60 * 1000;
    private static readonly changeEvents = new EventTarget();

    public static onChanged(
        callback: (data: Readonly<SaveData>) => void,
        target?: object,
    ): void {
        this.changeEvents.on(STORAGE_CHANGED_EVENT, callback, target);
    }

    public static offChanged(
        callback: (data: Readonly<SaveData>) => void,
        target?: object,
    ): void {
        this.changeEvents.off(STORAGE_CHANGED_EVENT, callback, target);
    }

    public static load(): SaveData {
        try {
            const nativeBridge = this.getNativeBridge();
            let storedValue: string | null = null;
            if (nativeBridge?.getStorage !== undefined) {
                try {
                    storedValue = nativeBridge.getStorage(STORAGE_KEY);
                } catch (error: unknown) {
                    console.warn('[StorageManager] Native load failed, using local storage', error);
                }
            }
            if (storedValue === null) {
                storedValue = sys.localStorage.getItem(STORAGE_KEY);
                if (storedValue !== null && nativeBridge?.setStorage !== undefined) {
                    nativeBridge.setStorage(STORAGE_KEY, storedValue);
                }
            }
            if (storedValue === null) {
                return this.createDefaultData();
            }
            return this.normalize(JSON.parse(storedValue) as unknown);
        } catch (error: unknown) {
            console.warn('[StorageManager] Invalid save data, using defaults', error);
            return this.createDefaultData();
        }
    }

    public static save(data: Readonly<SaveData>): void {
        const normalized = this.normalize(data);
        const serialized = JSON.stringify(normalized);
        const previousSerialized = JSON.stringify(this.load());
        const nativeBridge = this.getNativeBridge();
        if (nativeBridge?.setStorage !== undefined) {
            try {
                nativeBridge.setStorage(STORAGE_KEY, serialized);
            } catch (error: unknown) {
                console.warn('[StorageManager] Native save failed, using local storage', error);
            }
        }
        sys.localStorage.setItem(STORAGE_KEY, serialized);
        if (serialized !== previousSerialized) {
            this.changeEvents.emit(STORAGE_CHANGED_EVENT, normalized);
        }
    }

    public static update(mutator: (data: SaveData) => void): SaveData {
        const data = this.load();
        mutator(data);
        this.save(data);
        return data;
    }

    public static isBuffActive(
        type: TimedBuffType,
        data: Readonly<SaveData> = this.load(),
        now = Date.now(),
    ): boolean {
        const expiresAt = type === 'luck' ? data.buffs.luckUntil : data.buffs.freeGiftUntil;
        return expiresAt > now;
    }

    public static getBuffRemainingMs(type: TimedBuffType, now = Date.now()): number {
        const data = this.load();
        const expiresAt = type === 'luck' ? data.buffs.luckUntil : data.buffs.freeGiftUntil;
        return Math.max(0, expiresAt - now);
    }

    public static tryGrantFreeGift(): StoredBoosterType | null {
        const data = this.load();
        if (!this.isBuffActive('freeGift', data)
            || data.buffs.freeGiftClaimed
            || Math.random() >= 0.25) {
            return null;
        }
        const types: readonly StoredBoosterType[] = ['bomb', 'hammer', 'rainbow'];
        const type = types[Math.floor(Math.random() * types.length)];
        data.buffs.freeGiftClaimed = true;
        data.boosters[type] += 1;
        this.save(data);
        return type;
    }

    private static normalize(value: unknown): SaveData {
        const source = typeof value === 'object' && value !== null
            ? value as Partial<SaveData>
            : {};
        const boosters: Partial<SaveData['boosters']> =
            typeof source.boosters === 'object' && source.boosters !== null
                ? source.boosters
                : {};
        const tutorials: Partial<SaveData['tutorials']> =
            typeof source.tutorials === 'object' && source.tutorials !== null
                ? source.tutorials
                : {};
        const settings: Partial<SaveData['settings']> =
            typeof source.settings === 'object' && source.settings !== null
                ? source.settings
                : {};
        const buffs: Partial<SaveData['buffs']> =
            typeof source.buffs === 'object' && source.buffs !== null
                ? source.buffs
                : {};
        const levelStars = this.normalizeStars(source.levelStars);
        const claimedLevelRewards = this.normalizeClaims(source.claimedLevelRewards);
        // Old saves did not track claims. A level with stars was already completed,
        // so treat its completion reward as claimed to prevent replay farming.
        if (source.claimedLevelRewards === undefined) {
            for (const levelId of Object.keys(levelStars)) {
                const stars = levelStars[levelId];
                if (stars > 0) {
                    claimedLevelRewards[levelId] = true;
                }
            }
            const unlockedLevel = Math.max(1, this.toNonNegativeInteger(source.level, 1));
            for (let levelId = 1; levelId < unlockedLevel; levelId += 1) {
                claimedLevelRewards[levelId.toString()] = true;
            }
        }
        return {
            bestScore: this.toNonNegativeInteger(source.bestScore),
            coin: this.toNonNegativeInteger(source.coin),
            level: Math.max(1, this.toNonNegativeInteger(source.level, 1)),
            levelStars,
            claimedLevelRewards,
            claimedLevelAdRewards: this.normalizeClaims(source.claimedLevelAdRewards),
            tutorials: {
                playCompleted: tutorials.playCompleted === true,
                matchCompleted: tutorials.matchCompleted === true,
                boosterCompleted: tutorials.boosterCompleted === true,
            },
            settings: {
                musicEnabled: settings.musicEnabled !== false,
                effectsEnabled: settings.effectsEnabled !== false,
            },
            starterBoostersGranted: source.starterBoostersGranted === true,
            boosters: {
                bomb: this.toNonNegativeInteger(boosters.bomb),
                hammer: this.toNonNegativeInteger(boosters.hammer),
                rainbow: this.toNonNegativeInteger(boosters.rainbow),
            },
            buffs: {
                luckUntil: this.toNonNegativeInteger(buffs.luckUntil),
                freeGiftUntil: this.toNonNegativeInteger(buffs.freeGiftUntil),
                freeGiftClaimed: buffs.freeGiftClaimed === true,
            },
        };
    }

    private static getNativeBridge(): CocosJavaStorageBridge | null {
        const nativeWindow = globalThis as unknown as NativeStorageWindow;
        return nativeWindow.cocosJava ?? null;
    }

    private static createDefaultData(): SaveData {
        return {
            bestScore: DEFAULT_SAVE_DATA.bestScore,
            coin: DEFAULT_SAVE_DATA.coin,
            level: DEFAULT_SAVE_DATA.level,
            levelStars: {},
            claimedLevelRewards: {},
            claimedLevelAdRewards: {},
            tutorials: {
                playCompleted: false,
                matchCompleted: false,
                boosterCompleted: false,
            },
            settings: {
                musicEnabled: true,
                effectsEnabled: true,
            },
            starterBoostersGranted: false,
            boosters: { ...DEFAULT_SAVE_DATA.boosters },
            buffs: { ...DEFAULT_SAVE_DATA.buffs },
        };
    }

    private static toNonNegativeInteger(value: unknown, fallback = 0): number {
        return typeof value === 'number' && Number.isFinite(value)
            ? Math.max(0, Math.floor(value))
            : fallback;
    }

    private static normalizeStars(value: unknown): Record<string, number> {
        if (typeof value !== 'object' || value === null) {
            return {};
        }
        const stars: Record<string, number> = {};
        const source = value as Record<string, unknown>;
        for (const levelId of Object.keys(source)) {
            const rating = source[levelId];
            if (/^\d+$/.test(levelId) && typeof rating === 'number' && Number.isFinite(rating)) {
                stars[levelId] = Math.max(0, Math.min(3, Math.floor(rating)));
            }
        }
        return stars;
    }

    private static normalizeClaims(value: unknown): Record<string, boolean> {
        if (typeof value !== 'object' || value === null) {
            return {};
        }
        const claims: Record<string, boolean> = {};
        const source = value as Record<string, unknown>;
        for (const levelId of Object.keys(source)) {
            const claimed = source[levelId];
            if (/^\d+$/.test(levelId) && claimed === true) {
                claims[levelId] = true;
            }
        }
        return claims;
    }
}
