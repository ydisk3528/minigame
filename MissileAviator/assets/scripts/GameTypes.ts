import { Vec3 } from 'cc';

export enum GameState { Menu, Playing, GameOver }
export type RingKind = 'normal' | 'moving' | 'shrinking' | 'coin' | 'speed';
export type PowerUpKind = 'repair' | 'shield' | 'rapid' | 'spread' | 'laser' | 'plasma' | 'rocket';
export type BackgroundTheme = 'spring-morning' | 'summer-noon' | 'autumn-evening' | 'winter-night';
export type CustomEnemyKind = 'fighter' | 'bomber' | 'diveBomber' | 'interceptor';
export type FormationPattern = 'auto' | 'v' | 'line' | 'echelon' | 'convoy' | 'custom';
export type PowerUpWeights = Record<PowerUpKind, number>;
export interface CustomFormationSlot { kind: CustomEnemyKind; col: number; row: number }

export interface WaveConfig {
  id: number;
  truckCount: number;
  fighterCount: number;
  bomberCount: number;
  diveBomberCount: number;
  tankCount: number;
  rocketTruckCount: number;
  interceptorCount: number;
  spawnInterval: number;
  enemySpeedScale: number;
  fireRateScale: number;
  formationChance: number;
  formationSize: number;
  formationPattern: FormationPattern;
  customFormation?: CustomFormationSlot[];
}

export interface LevelConfig {
  id: number;
  name: string;
  ringSpawnInterval: number;
  ringSpeed: number;
  ringRadius: number;
  ringRandomY: number;
  backgroundSpeed: number;
  backgroundTheme: BackgroundTheme;
  movingRingChance: number;
  shrinkingRingChance: number;
  powerUpChance: number;
  powerUpWeights: PowerUpWeights;
  targetScore: number;
  difficultyEvery: number;
  difficultySpeedStep: number;
  waves: WaveConfig[];
}

export interface PassResult { perfect: boolean; position: Vec3 }
