import { createLevel, validateLevel } from '../src/generator.js';

for (const shape of ['heart', 'fighter', 'h', 'random', 'mixed']) {
  const level = createLevel(12, { startLevel: 1, count: 30, seed: 'check', columns: 25, rows: 38, shape, tools: { remove: 3, hint: 2, bomb: 1 }, rewardType: 'random', rewardAmount: 1 }, []);
  const error = validateLevel(level);
  if (error) throw new Error(`${shape}: ${error}`);
}
console.log('Generator self-check passed');
