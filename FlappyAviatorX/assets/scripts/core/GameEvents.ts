import { EventTarget } from 'cc';

export const gameEvents = new EventTarget();
export const Events = {
    START: 'game-start',
    RESTART: 'game-restart',
    MENU: 'game-menu',
    QUIT: 'game-quit',
    SCORE: 'score-changed',
    GAME_OVER: 'game-over',
    LEVEL_SELECT: 'level-select',
    SELECT_LEVEL: 'select-level',
    NEXT_LEVEL: 'next-level',
} as const;
