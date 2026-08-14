import { sys } from 'cc';

const PENDING_LEVEL_KEY = 'block_blast_pending_level';

/** One-scene handoff for selecting a level before Game.scene is loaded. */
export class LevelSelectionState {
    private static pendingLevelId: number | null = null;

    public static set(levelId: number): void {
        this.pendingLevelId = Math.max(1, Math.floor(levelId));
        sys.localStorage.setItem(PENDING_LEVEL_KEY, this.pendingLevelId.toString());
    }

    public static peek(fallback = 1): number {
        return this.pendingLevelId
            ?? this.readStoredLevel()
            ?? Math.max(1, Math.floor(fallback));
    }

    public static consume(): number | null {
        const levelId = this.pendingLevelId ?? this.readStoredLevel();
        this.pendingLevelId = null;
        sys.localStorage.removeItem(PENDING_LEVEL_KEY);
        return levelId;
    }

    private static readStoredLevel(): number | null {
        const value = Number(sys.localStorage.getItem(PENDING_LEVEL_KEY));
        return Number.isFinite(value) && value >= 1 ? Math.floor(value) : null;
    }
}
