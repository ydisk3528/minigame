import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { countPossibleMoves, validateLevel } from "../src/levelChecks.js";

const target = resolve(dirname(fileURLToPath(import.meta.url)), "../../assets/resources/levels");
const catalog = JSON.parse(await readFile(resolve(target, "catalog.json"), "utf8"));
const samples = new Set([1, 10, 20, 30, 60, 80, 100]);
const sampleRows = [];
for (const entry of catalog.levels) {
  const number = entry.level;
  const level = JSON.parse(await readFile(resolve(target, entry.file), "utf8"));
  const issues = validateLevel(level);
  const errors = issues.filter(issue => issue.severity === "error");
  if (errors.length) throw new Error(`Level ${number}: ${errors.map(issue => issue.message).join("; ")}`);
  if (samples.has(number)) sampleRows.push({ level: number, difficulty: level.difficulty, moves: level.moveLimit,
    colors: level.gemTypes, goals: level.goals.length, obstacles: level.obstacles.length,
    possibleMoves: countPossibleMoves(level), warnings: issues.filter(issue => issue.severity === "warning").length });
}
if (catalog.count !== catalog.levels.length) throw new Error("Catalog count mismatch");
console.table(sampleRows);
console.log(`VALID: ${catalog.count} cataloged levels, initial boards, legal moves, goals and difficulty parameters`);
