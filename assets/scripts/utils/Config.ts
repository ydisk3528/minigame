export const GAME_CONFIG = Object.freeze({
    designWidth: 1920,
    designHeight: 1280,
    boardRows: 8,
    boardColumns: 26,
    previewCount: 3,
} as const);

export type GameConfig = typeof GAME_CONFIG;
