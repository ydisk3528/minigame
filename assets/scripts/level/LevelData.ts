export interface LevelData {
    readonly id: number;
    readonly gameMode?: GameMode;
    readonly targetScore: number;
    readonly availableShapes: readonly number[];
    readonly reward: number;
    readonly boardMask?: readonly string[];
    readonly difficulty?: 'easy' | 'normal' | 'hard';
    readonly match3Config?: Match3Config;
    readonly boosterReward?: {
        readonly type: 'bomb' | 'hammer' | 'rainbow' | 'random' | 'all';
        readonly amount: number;
    };
}

export type GameMode = 'blockPuzzle' | 'match3';

export interface Match3Config {
    readonly moveLimit: number;
    readonly colorCount: number;
    readonly matchLength?: number;
    readonly guaranteedFeatures?: readonly GuaranteedMatchFeature[];
}

export type GuaranteedMatchFeature =
    | 'rocketHorizontal'
    | 'rocketVertical'
    | 'bomb'
    | 'rainbow'
    | 'vortex';

export const MAX_LEVEL_COUNT = 10_000;

const SHAPE_COUNT = 27;
const BOARD_ROWS = 8;
const MAX_BOARD_COLUMNS = 26;
const EASY_SHAPE_IDS = [1, 2, 3, 4, 5, 6, 7, 10] as const;

export function generateLevelData(levelId: number): LevelData {
    const id = Math.min(MAX_LEVEL_COUNT, Math.max(1, Math.floor(levelId)));
    const difficulty = id <= 10 ? 'easy' : id <= 50 ? 'normal' : 'hard';
    const gameMode: GameMode = 'match3';
    const targetScore = createTargetScore(id, gameMode, difficulty);
    const reward = 100 + ((Math.imul(id, 1103515245) >>> 0) % 401);
    const shapePoolSize = difficulty === 'easy'
        ? Math.min(14, 8 + Math.floor(id / 3))
        : Math.min(SHAPE_COUNT, 14 + Math.floor(id / 5));
    const availableShapes = createDeterministicShapePool(
        id,
        shapePoolSize,
        difficulty === 'easy' ? EASY_SHAPE_IDS : undefined,
    );

    return {
        id,
        gameMode,
        difficulty,
        targetScore,
        availableShapes,
        reward,
        boardMask: createDefaultBoardMask(difficulty, id),
        match3Config: createMatch3Config(difficulty, id),
    };
}

export function isLevelData(value: unknown): value is LevelData {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const candidate = value as Partial<LevelData>;
    return Number.isInteger(candidate.id)
        && (candidate.gameMode === undefined
            || candidate.gameMode === 'blockPuzzle'
            || candidate.gameMode === 'match3')
        && Number.isFinite(candidate.targetScore)
        && (candidate.targetScore ?? 0) > 0
        && Number.isFinite(candidate.reward)
        && (candidate.reward ?? -1) >= 0
        && Array.isArray(candidate.availableShapes)
        && candidate.availableShapes.length > 0
        && candidate.availableShapes.every((shapeId) =>
            Number.isInteger(shapeId) && shapeId >= 1 && shapeId <= SHAPE_COUNT,
        )
        && (candidate.difficulty === undefined
            || candidate.difficulty === 'easy'
            || candidate.difficulty === 'normal'
            || candidate.difficulty === 'hard')
        && isBoosterReward(candidate.boosterReward)
        && isBoardMask(candidate.boardMask)
        && isMatch3Config(candidate.gameMode, candidate.match3Config);
}

function isMatch3Config(
    gameMode: LevelData['gameMode'],
    config: LevelData['match3Config'],
): boolean {
    if (gameMode !== 'match3') {
        return config === undefined;
    }
    return config !== undefined
        && Number.isInteger(config.moveLimit)
        && config.moveLimit >= 5
        && config.moveLimit <= 99
        && Number.isInteger(config.colorCount)
        && (config.colorCount === 0
            || (config.colorCount >= 3 && config.colorCount <= 1000))
        && (config.matchLength === undefined
            || (Number.isInteger(config.matchLength)
                && config.matchLength >= 3
                && config.matchLength <= 5))
        && isGuaranteedFeatures(config.guaranteedFeatures);
}

function isGuaranteedFeatures(features: Match3Config['guaranteedFeatures']): boolean {
    if (features === undefined) {
        return true;
    }
    const allowed: readonly GuaranteedMatchFeature[] = [
        'rocketHorizontal',
        'rocketVertical',
        'bomb',
        'rainbow',
        'vortex',
    ];
    return Array.isArray(features)
        && features.length <= allowed.length
        && new Set(features).size === features.length
        && features.every((feature) => allowed.indexOf(feature) >= 0);
}

function createMatch3Config(
    difficulty: NonNullable<LevelData['difficulty']>,
    levelId: number,
): Match3Config {
    return {
        moveLimit: difficulty === 'easy' ? 42 : difficulty === 'normal' ? 32 : 25,
        colorCount: 0,
        matchLength: 3,
        ...(levelId === 2 ? { guaranteedFeatures: ['vortex'] as const } : {}),
    };
}

function createTargetScore(
    id: number,
    gameMode: GameMode,
    difficulty: NonNullable<LevelData['difficulty']>,
): number {
    if (gameMode === 'match3') {
        if (difficulty === 'easy') {
            return 500 + Math.min(4, Math.max(0, Math.floor((id - 2) / 2))) * 30;
        }
        if (difficulty === 'normal') {
            return 950 + Math.min(19, Math.max(0, Math.floor((id - 12) / 2))) * 50;
        }
        return 1600 + Math.min(24, Math.max(0, Math.floor((id - 52) / 2))) * 80;
    }
    if (difficulty === 'easy') {
        return 400 + Math.min(4, Math.max(0, Math.floor((id - 1) / 2))) * 50;
    }
    if (difficulty === 'normal') {
        return 1400 + Math.min(19, Math.max(0, Math.floor((id - 11) / 2))) * 80;
    }
    return 2600 + Math.min(24, Math.max(0, Math.floor((id - 51) / 2))) * 120;
}

function isBoosterReward(reward: LevelData['boosterReward']): boolean {
    if (reward === undefined) {
        return true;
    }
    return (reward.type === 'bomb'
        || reward.type === 'hammer'
        || reward.type === 'rainbow'
        || reward.type === 'random'
        || reward.type === 'all')
        && Number.isInteger(reward.amount)
        && reward.amount > 0;
}

function isBoardMask(mask: LevelData['boardMask']): boolean {
    if (mask === undefined) {
        return true;
    }
    return Array.isArray(mask)
        && mask.length === BOARD_ROWS
        && mask.every((row) => typeof row === 'string'
            && (/^[01]{8}$/.test(row) || /^[01]{12}$/.test(row) || /^[01]{26}$/.test(row)))
        && mask.some((row) => row.includes('1'));
}

export function createDefaultBoardMask(
    difficulty: NonNullable<LevelData['difficulty']>,
    levelId = 0,
): readonly string[] {
    const difficultyColumns = difficulty === 'easy' ? 8 : difficulty === 'normal' ? 10 : 12;
    const progressionColumns = levelId <= 10 ? 8
        : levelId <= 50 ? 10
            : levelId <= 100 ? 12
                : levelId <= 250 ? 16
                    : levelId <= 500 ? 20
                        : levelId <= 750 ? 24 : 26;
    const activeColumns = Math.max(difficultyColumns, progressionColumns);
    const firstColumn = Math.floor((MAX_BOARD_COLUMNS - activeColumns) / 2);
    const lastColumn = firstColumn + activeColumns - 1;
    const centerColumn = (firstColumn + lastColumn) / 2;
    const columnWeight = 8 / activeColumns;
    const pattern = levelId <= 0 ? 0 : (levelId - 1) % 10;
    const activeAt = (row: number, column: number): boolean => {
        if (pattern === 0) {
            return column >= firstColumn && column <= lastColumn;
        }
        if (pattern === 1) {
            return column >= firstColumn && column <= lastColumn
                && Math.abs(row - 3.5) + Math.abs(column - centerColumn) * columnWeight <= 4;
        }
        if (pattern === 2) {
            return column >= firstColumn && column <= lastColumn
                && ((row >= 2 && row <= 5) || Math.abs(column - centerColumn) <= 1.5);
        }
        if (pattern === 3) {
            if (column < firstColumn || column > lastColumn) return false;
            return !((row === 0 || row === 7)
                && (column === firstColumn || column === lastColumn));
        }
        if (pattern === 4) {
            if (column < firstColumn || column > lastColumn) return false;
            const halfWidth = Math.max(2, Math.floor(
                activeColumns * (0.18 + Math.abs(row - 3.5) * 0.035),
            ));
            return Math.abs(column - centerColumn) <= halfWidth;
        }
        if (pattern === 5) {
            if (column < firstColumn || column > lastColumn) return false;
            const sideWidth = Math.max(2, Math.floor(activeColumns * 0.16));
            return column < firstColumn + sideWidth || column > lastColumn - sideWidth
                || row === 3 || row === 4;
        }
        if (pattern === 6) {
            const width = Math.max(6, Math.round(activeColumns * 0.62));
            const shift = Math.round(Math.max(0, activeColumns - width) * row / 7);
            return column >= firstColumn + shift && column < firstColumn + shift + width;
        }
        if (pattern === 7) {
            const leftWidth = Math.max(4, Math.floor(activeColumns * 0.32));
            const leftSquare = row >= 2 && row <= 5
                && column >= firstColumn && column < firstColumn + leftWidth;
            const rightCenter = firstColumn + activeColumns * 0.78;
            const rightDiamond = Math.abs(row - 3.5)
                + Math.abs(column - rightCenter) * columnWeight * 1.55 <= 3.6;
            return leftSquare || rightDiamond;
        }
        if (pattern === 8) {
            const centers = [
                firstColumn + activeColumns * 0.24,
                firstColumn + activeColumns * 0.76,
            ];
            return centers.some((center) =>
                Math.abs(row - 3.5)
                    + Math.abs(column - center) * columnWeight * 1.8 <= 3.2);
        }
        const inset = Math.floor(Math.abs(row - 3.5) / 2);
        const wingWidth = Math.max(4, Math.floor(activeColumns * 0.34));
        return (column >= firstColumn + inset && column < firstColumn + wingWidth)
            || (column > lastColumn - wingWidth && column <= lastColumn - inset);
    };
    return Array.from({ length: BOARD_ROWS }, (_, row) =>
        Array.from({ length: MAX_BOARD_COLUMNS }, (_, column) =>
            activeAt(row, column) ? '1' : '0').join(''));
}

export function createBlockBlastBoardMask(): readonly string[] {
    const activeColumns = 8;
    const firstColumn = Math.floor((MAX_BOARD_COLUMNS - activeColumns) / 2);
    const row = `${'0'.repeat(firstColumn)}${'1'.repeat(activeColumns)}${'0'.repeat(
        MAX_BOARD_COLUMNS - firstColumn - activeColumns,
    )}`;
    return Array.from({ length: BOARD_ROWS }, () => row);
}

function createDeterministicShapePool(
    seed: number,
    count: number,
    source: readonly number[] = Array.from({ length: SHAPE_COUNT }, (_, index) => index + 1),
): readonly number[] {
    const shapeIds = [...source];
    let state = (seed * 2654435761) >>> 0;
    for (let index = shapeIds.length - 1; index > 0; index -= 1) {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        const swapIndex = state % (index + 1);
        [shapeIds[index], shapeIds[swapIndex]] = [shapeIds[swapIndex], shapeIds[index]];
    }
    return shapeIds.slice(0, Math.min(count, shapeIds.length)).sort((left, right) => left - right);
}
