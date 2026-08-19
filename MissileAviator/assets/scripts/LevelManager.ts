import { JsonAsset, resources } from 'cc';
import { LevelConfig } from './GameTypes';

const FALLBACK: LevelConfig[] = [{
  id: 1, name: '蓝天巡航', ringSpawnInterval: 1.8, ringSpeed: 260,
  ringRadius: 92, ringRandomY: 220, backgroundSpeed: 45,
  movingRingChance: 0.12, shrinkingRingChance: 0.08, powerUpChance: 0.08,
  targetScore: 20, difficultyEvery: 5, difficultySpeedStep: 16,
}];

export class LevelManager {
  private levels = FALLBACK;

  async load(): Promise<void> {
    this.levels = await new Promise(resolve => resources.load('levels/levels', JsonAsset,
      (error, asset) => resolve(error ? FALLBACK : (asset.json as { levels: LevelConfig[] }).levels)));
  }

  get(id = 1): LevelConfig {
    return this.levels.find(level => level.id === id) ?? this.levels[0];
  }
}

