# Vue Level Editor

```bash
npm install
npm run dev
```

In Chrome or Edge, select **OPEN JSON** and open `assets/resources/config/levels.json` from the game project. After editing, select **SAVE / EXPORT** to write back to the same file. Browsers without the File System Access API will download a new `levels.json` instead.

## Random mission generation

Set **MISSION COUNT** and **RANDOM SEED**, then select **GENERATE MISSIONS**. Background themes repeat by level: day, sunset, night, then day again. Difficulty still progresses through easy, normal, and hard thirds.

Use **ADD RANGE RULE** to override any level range with a difficulty, background theme, and pipe pattern. Later overlapping rules take priority. Reusing the same seed and rules produces identical output.
