import { Vec2 } from 'cc';

export type ExitDirection = 'up' | 'down' | 'left' | 'right';

export interface ArrowPathData {
    id: number;
    points: [number, number][];
    exitDirection: ExitDirection;
    color?: string;
}

export interface LevelData {
    level: number;
    grid: { columns: number; rows: number; cellSize: number };
    paths: ArrowPathData[];
    difficulty?: 'easy' | 'normal' | 'hard';
    shape?: string;
    timeLimit?: number;
    tools?: { remove: number; hint: number; bomb: number };
    rewardTools?: { type: 'remove' | 'hint' | 'bomb' | 'random'; amount: number };
}

export const directionVector = (direction: ExitDirection): Vec2 => ({
    up: new Vec2(0, 1),
    down: new Vec2(0, -1),
    left: new Vec2(-1, 0),
    right: new Vec2(1, 0),
}[direction]);
