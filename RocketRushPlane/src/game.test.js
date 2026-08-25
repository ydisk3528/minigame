import test from 'node:test';
import assert from 'node:assert/strict';
import { createLeaderboard, FlightMultiplierGenerator, GameMachine, GameState, MultiplierController } from './game.js';

test('core flight logic remains deterministic and bounded', () => {
  const multiplier = new MultiplierController();
  assert.equal(multiplier.valueAt(0, 4, 5), 1);
  assert.ok(multiplier.valueAt(4, 4, 5) > multiplier.valueAt(2, 4, 5));
  assert.equal(multiplier.valueAt(5, 4, 5), 4);
  const generated = new FlightMultiplierGenerator([{ min: 2, max: 3, weight: 1 }], () => 0.5).next();
  assert.equal(generated, 2.5);
  const machine = new GameMachine();
  machine.move(GameState.Ready);
  machine.move(GameState.Flying);
  assert.equal(machine.state, GameState.Flying);
  assert.throws(() => machine.move(GameState.Result));
});

test('simulated leaderboard is unique and score-sorted', () => {
  let seed = 0;
  const board = createLeaderboard(() => ((seed += 0.173) % 1), 5);
  assert.equal(board.length, 5);
  assert.equal(new Set(board.map((entry) => entry.name)).size, 5);
  assert.deepEqual(board.map((entry) => entry.score), board.map((entry) => entry.score).toSorted((a, b) => b - a));
});
