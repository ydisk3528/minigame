export interface TilePlacement { id: number; type: string; x: number; y: number; layer: number; }
export interface LevelConfig {
    level: number; slotCount: number; enableSequence: boolean; enableSpecialCombo: boolean;
    limitType: "time" | "moves"; timeLimit?: number; moveLimit?: number;
    seed: number; rewardCoins: number; starScores?: [number, number, number];
    props?: { undo: number; shuffle: number; move: number; hint: number; freeze: number };
    difficulty?: string; shape?: string; layout: TilePlacement[];
}
export async function loadLevel(path: string): Promise<LevelConfig> {
    const resource = await Laya.loader.load(path, Laya.Loader.JSON) as Laya.TextResource;
    const level = resource.data as LevelConfig;
    if (!level?.layout?.length || level.layout.length % 3 !== 0) throw new Error(`Invalid level: ${path}`);
    level.limitType = level.limitType === "moves" ? "moves" : "time";
    level.timeLimit = Math.max(10, Math.floor(level.timeLimit ?? 180));
    level.moveLimit = Math.max(3, Math.floor(level.moveLimit ?? Math.ceil(level.layout.length * 1.5)));
    return level;
}
