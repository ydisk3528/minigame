import { JsonAsset, resources } from 'cc';
import { LevelConfig, PowerUpWeights } from './GameTypes';

const DEFAULT_POWER_UP_WEIGHTS: PowerUpWeights = { repair: 2, shield: 2, rapid: 3, spread: 3, laser: 2, plasma: 2, rocket: 2 };

const FALLBACK: LevelConfig[] = [{
  id: 1, name: '蓝天巡航', ringSpawnInterval: 1.8, ringSpeed: 260,
  ringRadius: 92, ringRandomY: 220, backgroundSpeed: 45,
  movingRingChance: 0.12, shrinkingRingChance: 0.08, powerUpChance: 0.08,
  targetScore: 20, difficultyEvery: 5, difficultySpeedStep: 16,
  powerUpWeights: DEFAULT_POWER_UP_WEIGHTS,
  waves: [
    { id: 1, truckCount: 3, fighterCount: 2, bomberCount: 1, diveBomberCount: 1, tankCount: 1, rocketTruckCount: 1, interceptorCount: 0, spawnInterval: 1.5, enemySpeedScale: 1, fireRateScale: 1, formationChance: .45, formationSize: 3, formationPattern: 'auto' },
    { id: 2, truckCount: 3, fighterCount: 4, bomberCount: 2, diveBomberCount: 2, tankCount: 2, rocketTruckCount: 2, interceptorCount: 2, spawnInterval: 1.2, enemySpeedScale: 1.12, fireRateScale: 1.15, formationChance: .6, formationSize: 4, formationPattern: 'v' },
  ],
}];

export class LevelManager {
  private levels = FALLBACK;

  async load(): Promise<void> {
    this.levels = await new Promise(resolve => resources.load('levels/levels', JsonAsset,
      (error, asset) => resolve(error ? FALLBACK : (asset.json as { levels: LevelConfig[] }).levels.map(level => ({
        ...level, waves: (level.waves?.length ? level.waves : FALLBACK[0].waves).map(wave => ({
          ...wave, bomberCount: wave.bomberCount ?? 0, diveBomberCount: wave.diveBomberCount ?? 0,
          tankCount: wave.tankCount ?? 0, rocketTruckCount: wave.rocketTruckCount ?? 0, interceptorCount: wave.interceptorCount ?? 0,
          formationChance: wave.formationChance ?? .45, formationSize: wave.formationSize ?? 3, formationPattern: wave.formationPattern ?? 'auto',
        })),
        powerUpWeights: { ...DEFAULT_POWER_UP_WEIGHTS, ...level.powerUpWeights },
      })))));
  }

  get(id = 1): LevelConfig {
    return this.levels.find(level => level.id === id) ?? this.levels[0];
  }

  all(): readonly LevelConfig[] { return this.levels; }
}
