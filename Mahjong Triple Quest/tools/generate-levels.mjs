import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateBatch, levelFilename, makeCatalog, validateLevel } from "../level-editor/src/generateLevel.js";

const tools = path.dirname(fileURLToPath(import.meta.url));
const output = path.resolve(tools, "../assets/resources/levels");
const config = JSON.parse(fs.readFileSync(path.join(tools, "levels.config.json"), "utf8"));
const levels = generateBatch(config);
for (const level of levels) {
  validateLevel(level);
  fs.writeFileSync(path.join(output, levelFilename(level.level)), JSON.stringify(level, null, 2) + "\n");
}
fs.writeFileSync(path.join(output, "catalog.json"), JSON.stringify(makeCatalog(levels), null, 2) + "\n");
console.log(`Generated and validated ${levels.length} levels from levels.config.json`);
