export enum GameState { Menu, Playing, GameOver, LevelComplete }

export interface LevelConfig {
    id: number;
    theme: 'day' | 'sunset' | 'night';
    pipePattern: 'random' | 'alternating' | 'wave';
    pipeSpeed: number;
    spawnInterval: number;
    gapSize: number;
    gapCenterMin: number;
    gapCenterMax: number;
    patternAmplitude: number;
    patternStep: number;
    gravity: number;
    flapVelocity: number;
    maxFallSpeed: number;
    backgroundSpeed: number;
    itemSpawnChance: number;
    dashDuration: number;
    targetScore: number;
    specialObstacles: boolean;
}

export const GAME_WIDTH = 720;
export const GAME_HEIGHT = 1280;
export const GROUND_Y = -560;
