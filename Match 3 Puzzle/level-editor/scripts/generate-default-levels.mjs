import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { campaignSettingsForLevel, createLevel } from "../src/levelFactory.js";
import { validateLevel } from "../src/levelChecks.js";

const here = dirname(fileURLToPath(import.meta.url));
const target = resolve(here, "../../assets/resources/levels");
await mkdir(target, { recursive: true });
const shapePools = {
  easy: ["rectangle", "rectangle", "rectangle", "heart", "diamond"],
  normal: ["rectangle", "heart", "diamond", "staggered", "cross"],
  hard: ["heart", "diamond", "cross", "ring", "staggered", "pyramid"],
  expert: ["diamond", "cross", "ring", "hourglass", "butterfly", "pyramid", "castle", "staggered"],
};
const levels = Array.from({ length: 100 }, (_, index) => {
  const level = index + 1, settings = campaignSettingsForLevel(level);
  const pool = shapePools[settings.difficulty];
  const generated = createLevel({
    level, rows: 8, columns: 8, ...settings, shape: pool[index % pool.length], matchLength: 3,
    seed: "crystal-match-campaign-v2", autoGoals: true,
    horizontalRockets: level >= 6 ? 1 : 0,
    verticalRockets: level >= 9 ? 1 : 0,
    bombs: level >= 25 ? 1 : 0,
    rainbows: level >= 75 ? 1 : 0,
  });
  const errors = validateLevel(generated).filter(issue => issue.severity === "error");
  if (errors.length) throw new Error(`Level ${level}: ${errors.map(issue => issue.message).join("; ")}`);
  return generated;
});
for (const level of levels) await writeFile(resolve(target, `level_${String(level.level).padStart(3, "0")}.json`), JSON.stringify(level, null, 2));
await writeFile(resolve(target, "catalog.json"), JSON.stringify({ version: 1, count: levels.length, levels: levels.map(level => ({ level: level.level, file: `level_${String(level.level).padStart(3, "0")}.json`, shape: level.shape, difficulty: level.difficulty })) }, null, 2));
console.log(`Generated and checked ${levels.length} campaign levels in ${target}`);
