import { MatchDetector } from "./MatchDetector";

export type GoalType = "collectGem" | "breakIce" | "breakCrate" | "score";

export interface LevelGoal {
    type: GoalType;
    count: number;
    gemType?: number;
}

export interface LevelObstacle {
    row: number;
    column: number;
    type: number;
    hitPoints: number;
}

export interface InitialSpecial {
    row: number;
    column: number;
    specialType: number;
}

export type PropType = "hammer" | "magic" | "refresh" | "infinite";

export interface LevelProp {
    type: PropType;
    count: number;
}

export interface LevelData {
    level: number;
    rows: number;
    columns: number;
    moveLimit: number;
    gemTypes: number;
    difficulty?: "easy" | "normal" | "hard" | "expert";
    shape?: string;
    matchLength?: number;
    starScores?: [number, number, number];
    mask?: number[][];
    goals: LevelGoal[];
    obstacles: LevelObstacle[];
    initialSpecials?: InitialSpecial[];
    props?: LevelProp[];
    initialLayout: number[][];
}

export class LevelLoader {
    public static async load(path: string): Promise<LevelData> {
        const resource = await Laya.loader.load(path, Laya.Loader.JSON) as Laya.TextResource;
        const level = resource.data as LevelData;
        level.difficulty ??= "normal";
        level.shape ??= "rectangle";
        level.matchLength ??= 3;
        level.starScores ??= [3000, 6000, 9000];
        level.props ??= [
            { type: "hammer", count: 3 },
            { type: "magic", count: 1 },
            { type: "refresh", count: 1 },
            { type: "infinite", count: 0 },
        ];
        level.mask ??= Array.from({ length: level.rows }, () => Array(level.columns).fill(1));
        LevelLoader.validate(level);
        LevelLoader.normalizeInitialLayout(level);
        return level;
    }

    private static validate(level: LevelData): void {
        const validGrid = level?.rows > 0 && level.columns > 0
            && level.initialLayout?.length === level.rows
            && level.initialLayout.every((row) => row.length === level.columns
                && row.every((type) => type >= 0 && type < level.gemTypes));
        const validMask = level.mask?.length === level.rows
            && level.mask.every((row) => row.length === level.columns && row.every((cell) => cell === 0 || cell === 1));
        if (!validGrid || !validMask || level.moveLimit <= 0 || !level.goals?.length
            || (level.matchLength ?? 3) < 3 || (level.matchLength ?? 3) > 5) {
            throw new Error("Invalid match-3 level data.");
        }
        if (level.initialSpecials?.some((item) => item.row < 0 || item.row >= level.rows
            || item.column < 0 || item.column >= level.columns
            || item.specialType < 1 || item.specialType > 4)) {
            throw new Error("Invalid initial special gem data.");
        }
        const propTypes: PropType[] = ["hammer", "magic", "refresh", "infinite"];
        if (level.props?.some((prop) => !propTypes.includes(prop.type) || !Number.isInteger(prop.count) || prop.count < 0)) {
            throw new Error("Invalid prop configuration.");
        }
    }

    private static normalizeInitialLayout(level: LevelData): void {
        const masked = level.initialLayout.map((row, rowIndex) => row.map((type, column) =>
            level.mask?.[rowIndex]?.[column] ? type : -1));
        if (!MatchDetector.find(masked, level.matchLength).length) return;
        for (let attempt = 0; attempt < 100; attempt++) {
            const layout = Array.from({ length: level.rows }, () => Array(level.columns).fill(-1));
            let complete = true;
            for (let row = 0; row < level.rows && complete; row++) for (let column = 0; column < level.columns; column++) {
                if (!level.mask?.[row]?.[column]) continue;
                const types = Array.from({ length: level.gemTypes }, (_, type) => type)
                    .sort(() => Math.random() - 0.5);
                const selected = types.find((type) => {
                    layout[row][column] = type;
                    const valid = MatchDetector.find(layout, level.matchLength).length === 0;
                    layout[row][column] = -1;
                    return valid;
                });
                if (selected === undefined) complete = false;
                else layout[row][column] = selected;
            }
            if (complete) {
                level.initialLayout = layout.map((row) => row.map((type) => type < 0 ? 0 : type));
                return;
            }
        }
        const layout = Array.from({ length: level.rows }, () => Array(level.columns).fill(-1));
        const positions = layout.flatMap((row, rowIndex) => row.flatMap((_, column) =>
            level.mask?.[rowIndex]?.[column] ? [{ row: rowIndex, column }] : []));
        const fill = (index: number): boolean => {
            if (index === positions.length) return true;
            const position = positions[index];
            for (let type = 0; type < level.gemTypes; type++) {
                layout[position.row][position.column] = type;
                if (!MatchDetector.find(layout, level.matchLength).length && fill(index + 1)) return true;
            }
            layout[position.row][position.column] = -1;
            return false;
        };
        if (!fill(0)) throw new Error("Unable to create a match-free initial layout.");
        level.initialLayout = layout.map((row) => row.map((type) => type < 0 ? 0 : type));
    }
}
