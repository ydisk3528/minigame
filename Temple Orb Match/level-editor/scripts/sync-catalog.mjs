import { readdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const target = resolve(dirname(fileURLToPath(import.meta.url)), "../../assets/resources/levels");
const files = (await readdir(target)).filter(file => /^level_\d+\.json$/.test(file)).sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
const levels = [];
for (const file of files) {
  const level = JSON.parse(await readFile(resolve(target, file), "utf8"));
  levels.push({ level: level.level, file, shape: level.shape, difficulty: level.difficulty });
}
await writeFile(resolve(target, "catalog.json"), JSON.stringify({ version: 1, count: levels.length, levels }, null, 2));
console.log(`Catalog synced: ${levels.length} levels`);
