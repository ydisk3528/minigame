import { EventTarget, Vec3 } from 'cc';

export const GameEvent = {
    PATH_CLEARED: 'path-cleared',
    PATH_BLOCKED: 'path-blocked',
    LEVEL_CLEAR: 'level-clear',
    LEVEL_RESTART: 'level-restart',
} as const;

export interface PathClearedEvent { position: Vec3; remaining: number }
export const eventBus = new EventTarget();
