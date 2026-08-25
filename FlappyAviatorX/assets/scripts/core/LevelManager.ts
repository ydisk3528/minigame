import { JsonAsset, resources, sys } from 'cc';
import { LevelConfig } from './GameTypes';

export class LevelManager {
    private static levels: LevelConfig[] = [];

    static loadAll() {
        if (this.levels.length) return Promise.resolve(this.levels);
        return new Promise<LevelConfig[]>((resolve, reject) => {
            resources.load('config/levels', JsonAsset, (error, asset) => {
                if (error) return reject(error);
                this.levels = (asset.json as { levels: LevelConfig[] }).levels.map(level => ({
                    theme: 'day', pipePattern: 'random', patternAmplitude: 220, patternStep: .9,
                    gravity: -1500, flapVelocity: 520, maxFallSpeed: -760,
                    ...level,
                }));
                resolve(this.levels);
            });
        });
    }

    static load(levelId = 1) {
        return this.loadAll().then(levels => levels.find(level => level.id === levelId) ?? levels[0]);
    }

    static get selectedId() { return Number(sys.localStorage.getItem('flappy-selected-level') || 1); }
    static set selectedId(id: number) { sys.localStorage.setItem('flappy-selected-level', `${id}`); }
    static get unlockedId() { return Math.max(1, Number(sys.localStorage.getItem('flappy-unlocked-level') || 1)); }
    static isUnlocked(id: number) { return id <= this.unlockedId; }

    static unlockNext(currentId: number) {
        const next = this.next(currentId);
        if (next && next.id > this.unlockedId) sys.localStorage.setItem('flappy-unlocked-level', `${next.id}`);
        return next;
    }

    static next(currentId: number) {
        const index = this.levels.findIndex(level => level.id === currentId);
        return index >= 0 ? this.levels[index + 1] ?? null : null;
    }
}
