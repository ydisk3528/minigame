import { Vec3 } from 'cc';

export enum GameState { Menu, Playing, GameOver }
export type RingKind = 'normal' | 'moving' | 'shrinking' | 'coin' | 'speed';
export type PowerUpKind = 'shield' | 'magnet' | 'dash' | 'slow';

export interface LevelConfig {
  id: number;
  name: string;
  ringSpawnInterval: number;
  ringSpeed: number;
  ringRadius: number;
  ringRandomY: number;
  backgroundSpeed: number;
  movingRingChance: number;
  shrinkingRingChance: number;
  powerUpChance: number;
  targetScore: number;
  difficultyEvery: number;
  difficultySpeedStep: number;
}

export interface PassResult { perfect: boolean; position: Vec3 }

