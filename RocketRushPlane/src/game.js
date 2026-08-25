import { CONFIG } from './config.js';

export const GameState = Object.freeze({
  Idle: 'Idle', Ready: 'Ready', Flying: 'Flying', Ending: 'Ending',
  Success: 'Success', Failed: 'Failed', Result: 'Result'
});

const routes = {
  [GameState.Idle]: [GameState.Ready],
  [GameState.Ready]: [GameState.Flying],
  [GameState.Flying]: [GameState.Ending],
  [GameState.Ending]: [GameState.Success, GameState.Failed],
  [GameState.Success]: [GameState.Result],
  [GameState.Failed]: [GameState.Result],
  [GameState.Result]: [GameState.Ready]
};

export class GameMachine {
  state = GameState.Idle;
  move(next) {
    if (!routes[this.state]?.includes(next)) throw new Error(`Invalid state: ${this.state} -> ${next}`);
    this.state = next;
  }
}

export class FlightMultiplierGenerator {
  constructor(ranges = CONFIG.ranges, random = Math.random) {
    this.ranges = ranges;
    this.random = random;
  }
  next() {
    const total = this.ranges.reduce((sum, item) => sum + item.weight, 0);
    let pick = this.random() * total;
    const range = this.ranges.find((item) => (pick -= item.weight) <= 0) ?? this.ranges.at(-1);
    return range.min + this.random() * (range.max - range.min);
  }
}

export class MultiplierController {
  valueAt(seconds, target, duration = CONFIG.flightDuration) {
    const progress = Math.min(seconds / duration, 1);
    const accelerated = progress * 0.35 + progress ** 2 * 0.65;
    return 1 + (target - 1) * accelerated;
  }
}

export function createLeaderboard(random = Math.random, count = 5) {
  const names = [...CONFIG.leaderboardNames];
  for (let i = names.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [names[i], names[j]] = [names[j], names[i]];
  }
  return names.slice(0, count).map((name) => ({ name, score: 500 + Math.floor(random() * 9500) })).sort((a, b) => b.score - a.score);
}

const defaults = { totalScore: 0, bestMultiplier: 1, history: [], soundEnabled: true };

export class SaveStore {
  constructor(storage = globalThis.localStorage) { this.storage = storage; }
  load() {
    try { return { ...defaults, ...JSON.parse(this.storage.getItem('rocket-rush-plane') || '{}') }; }
    catch { return { ...defaults }; }
  }
  save(data) { this.storage.setItem('rocket-rush-plane', JSON.stringify(data)); }
}
