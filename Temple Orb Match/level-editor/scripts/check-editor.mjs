import assert from "node:assert/strict";
import { buildMask, campaignSettingsForLevel, createLevel, difficultyForLevel } from "../src/levelFactory.js";
import { createZip } from "../src/zipStore.js";
import { countPossibleMoves, validateLevel } from "../src/levelChecks.js";

const level = createLevel({
  level: 12, rows: 8, columns: 8, difficulty: "normal", shape: "rectangle",
  matchLength: 3, moveLimit: 25, gemTypes: 6, seed: "editor-check",
  mask: buildMask("rectangle"), ice: 4, crates: 2,
  horizontalRockets: 0, verticalRockets: 0, bombs: 0, rainbows: 0,
  hammerCount: 2, magicCount: 1, refreshCount: 1, infiniteCount: 0,
  goals: [{ type: "collectGem", gemType: 2, count: 15 }, { type: "breakIce", count: 4 }]
});

assert.deepEqual(level.goals, [{ type: "collectGem", gemType: 2, count: 15 }, { type: "breakIce", count: 4 }]);
assert.equal(level.obstacles.filter(item => item.type === 1).length, 4);
assert.equal(level.props.find(item => item.type === "hammer").count, 2);
assert.deepEqual([1, 11, 31, 61].map(difficultyForLevel), ["easy", "normal", "hard", "expert"]);
assert.deepEqual([1, 10, 20, 30, 60, 80, 100].map(item => campaignSettingsForLevel(item).difficulty),
  ["easy", "easy", "normal", "normal", "hard", "expert", "expert"]);
const automatic = createLevel({ ...level, level: 80, difficulty: "expert", autoGoals: true, seed: "auto-goals", mask: buildMask("rectangle") });
assert.equal(automatic.goals.length, 3);
assert.ok(automatic.goals.every(goal => goal.count > 0));
assert.ok(countPossibleMoves(automatic) > 0);
assert.equal(validateLevel(automatic).filter(issue => issue.severity === "error").length, 0);
const shapePool = ["heart", "ring"];
const shapedLevels = [3, 4, 5, 6].map(item => createLevel({ ...level, level: item, shape: "random", shapePool, mask: null, seed: "shape-rule" }));
assert.ok(shapedLevels.every(item => shapePool.includes(item.shape)));
assert.equal(createLevel({ ...level, shape: "random", shapePool: ["cross"], mask: null }).shape, "cross");
const zip = createZip([{ name: "level_001.json", data: "{}" }, { name: "catalog.json", data: "{}" }]);
assert.equal(zip.type, "application/zip");
assert.ok(zip.size > 100);
const zipBytes = new Uint8Array(await zip.arrayBuffer());
const zipView = new DataView(zipBytes.buffer);
const zipText = new TextDecoder().decode(zipBytes);
assert.equal(zipView.getUint32(0, true), 0x04034b50);
assert.equal(zipView.getUint32(zipBytes.length - 22, true), 0x06054b50);
assert.match(zipText, /level_001\.json/);
assert.match(zipText, /catalog\.json/);
console.log("VALID: editor goals, difficulty ramp, exact counts and ZIP output");
