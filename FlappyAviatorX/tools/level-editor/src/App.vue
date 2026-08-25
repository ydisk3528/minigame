<script setup>
import { computed, onMounted, ref } from 'vue';

const levels = ref([]);
const selected = ref(0);
const handle = ref(null);
const notice = ref('Open assets/resources/config/levels.json from the project.');
const current = computed(() => levels.value[selected.value]);
const generateCount = ref(30);
const generateSeed = ref(`${Date.now()}`);
const rangeRules = ref([]);
let nextRuleUid = 1;

const defaults = {
  theme: 'day', pipePattern: 'random', patternAmplitude: 220, patternStep: .9,
  pipeSpeed: 190, spawnInterval: 1.8, gapSize: 340, gapCenterMin: -210, gapCenterMax: 250,
  backgroundSpeed: 32, gravity: -1500, flapVelocity: 520, maxFallSpeed: -760,
  itemSpawnChance: .2, dashDuration: 2.5, targetScore: 5, specialObstacles: false
};
const normalize = data => data.levels.map(level => ({ ...defaults, ...level }));

const profiles = {
  easy: { pipeSpeed: [180, 215], spawnInterval: [1.7, 1.95], gapSize: [325, 360], gravity: [-1450, -1350], flapVelocity: [480, 510], maxFallSpeed: [-730, -680], targetScore: [5, 9] },
  normal: { pipeSpeed: [220, 260], spawnInterval: [1.42, 1.68], gapSize: [285, 320], gravity: [-1600, -1480], flapVelocity: [515, 550], maxFallSpeed: [-830, -750], targetScore: [9, 14] },
  hard: { pipeSpeed: [265, 310], spawnInterval: [1.2, 1.4], gapSize: [245, 280], gravity: [-1750, -1620], flapVelocity: [555, 590], maxFallSpeed: [-930, -850], targetScore: [14, 20] }
};
const themeCycle = ['day', 'sunset', 'night'];

function hashSeed(value) {
  let hash = 2166136261;
  for (const character of value) { hash ^= character.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  return hash >>> 0;
}
function createRandom(value) {
  let state = hashSeed(value) || 1;
  return () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 4294967296; };
}
const between = (random, [min, max], decimals = 0) => Number((min + random() * (max - min)).toFixed(decimals));
function ruleForLevel(id) {
  return [...rangeRules.value].reverse().find(rule => id >= Math.min(rule.startLevel, rule.endLevel) && id <= Math.max(rule.startLevel, rule.endLevel));
}
function difficultyForLevel(id, count) {
  const configured = ruleForLevel(id)?.difficulty;
  if (configured) return configured;
  const progress = (id - 1) / Math.max(1, count);
  return progress < 1 / 3 ? 'easy' : progress < 2 / 3 ? 'normal' : 'hard';
}
function choice(random, configured, values) { return configured && configured !== 'mixed' ? configured : values[Math.floor(random() * values.length)]; }
function makeLevel(id, count) {
  const random = createRandom(`${generateSeed.value}:${id}`);
  const rule = ruleForLevel(id);
  const difficulty = difficultyForLevel(id, count);
  const profile = profiles[difficulty];
  const automaticTheme = themeCycle[(id - 1) % themeCycle.length];
  const theme = rule?.theme && rule.theme !== 'mixed' ? rule.theme : automaticTheme;
  const pipePattern = choice(random, rule?.pipePattern, difficulty === 'easy' ? ['random', 'alternating'] : ['random', 'alternating', 'wave']);
  return {
    id, theme, pipePattern,
    pipeSpeed: between(random, profile.pipeSpeed), spawnInterval: between(random, profile.spawnInterval, 2), gapSize: between(random, profile.gapSize),
    gapCenterMin: between(random, [-245, -205]), gapCenterMax: between(random, [245, 285]),
    patternAmplitude: between(random, [190, 245]), patternStep: between(random, [.65, 1.08], 2),
    gravity: between(random, profile.gravity), flapVelocity: between(random, profile.flapVelocity), maxFallSpeed: between(random, profile.maxFallSpeed),
    backgroundSpeed: Math.round(between(random, [30, 62]) + (difficulty === 'hard' ? 8 : 0)),
    itemSpawnChance: between(random, difficulty === 'easy' ? [.16, .22] : difficulty === 'normal' ? [.13, .18] : [.1, .15], 2),
    dashDuration: between(random, difficulty === 'hard' ? [1.9, 2.2] : [2.2, 2.6], 1),
    targetScore: between(random, profile.targetScore), specialObstacles: difficulty === 'hard' && random() < .3
  };
}
function generateLevels() {
  const count = Math.min(1000, Math.max(1, Math.floor(generateCount.value || 1)));
  generateCount.value = count;
  const generated = Array.from({ length: count }, (_, index) => makeLevel(index + 1, count));
  if (generated.some((level, index) => level.id !== index + 1 || level.gapSize < 180 || level.pipeSpeed <= 0)) throw new Error('Generated invalid mission data.');
  if (!rangeRules.value.length && generated.some(level => level.theme !== themeCycle[(level.id - 1) % themeCycle.length])) throw new Error('Generated invalid theme cycle.');
  levels.value = generated;
  selected.value = 0;
  notice.value = `Generated ${count} balanced missions with seed ${generateSeed.value}. Save / Export to use them in Cocos.`;
}
function addRangeRule() {
  rangeRules.value.push({ uid: nextRuleUid++, startLevel: 1, endLevel: Math.max(1, generateCount.value), difficulty: 'easy', theme: 'mixed', pipePattern: 'mixed' });
}
function removeRangeRule(uid) { rangeRules.value = rangeRules.value.filter(rule => rule.uid !== uid); }

onMounted(async () => {
  const data = await fetch('/levels.json').then(r => r.json());
  levels.value = normalize(data);
  generateCount.value = levels.value.length;
});

async function openFile() {
  if (!window.showOpenFilePicker) return notice.value = 'Direct file access requires Chrome or Edge.';
  [handle.value] = await window.showOpenFilePicker({ types: [{ description: 'Level JSON', accept: { 'application/json': ['.json'] } }] });
  const data = JSON.parse(await (await handle.value.getFile()).text());
  levels.value = normalize(data); generateCount.value = levels.value.length; selected.value = 0; notice.value = `Opened: ${handle.value.name}`;
}

async function saveFile() {
  const text = JSON.stringify({ levels: levels.value }, null, 2) + '\n';
  if (handle.value) {
    const writable = await handle.value.createWritable(); await writable.write(text); await writable.close();
    notice.value = 'Saved. Return to Cocos Creator and refresh the asset.'; return;
  }
  const blob = new Blob([text], { type: 'application/json' });
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'levels.json'; link.click(); URL.revokeObjectURL(link.href);
  notice.value = 'Downloaded levels.json.';
}

function addLevel() {
  const last = levels.value.at(-1);
  levels.value.push({ ...(last || defaults), id: (last?.id || 0) + 1 });
  selected.value = levels.value.length - 1;
}
function duplicate() { const copy = structuredClone(current.value); copy.id = Math.max(...levels.value.map(x => x.id)) + 1; levels.value.push(copy); selected.value = levels.value.length - 1; }
function remove() { if (levels.value.length <= 1) return; levels.value.splice(selected.value, 1); selected.value = Math.max(0, selected.value - 1); }

const fields = [
  ['pipeSpeed', 'Pipe Speed', 10], ['spawnInterval', 'Spawn Interval', .05], ['gapSize', 'Gap Size', 5],
  ['gapCenterMin', 'Minimum Gap Center', 5], ['gapCenterMax', 'Maximum Gap Center', 5],
  ['patternAmplitude', 'Pattern Amplitude', 5], ['patternStep', 'Pattern Step', .05], ['backgroundSpeed', 'Background Speed', 2],
  ['gravity', 'Plane Gravity', 10], ['flapVelocity', 'Plane Flap Velocity', 10], ['maxFallSpeed', 'Maximum Fall Speed', 10],
  ['itemSpawnChance', 'Item Spawn Chance', .01], ['dashDuration', 'Dash Duration', .1], ['targetScore', 'Target Score', 1]
];
</script>

<template>
  <main>
    <header>
      <div><h1>FLAPPY AVIATOR X</h1><p>PIXEL LEVEL EDITOR</p></div>
      <div class="actions"><button @click="openFile">OPEN JSON</button><button class="primary" @click="saveFile">SAVE / EXPORT</button></div>
    </header>
    <div class="notice">{{ notice }}</div>
    <section class="generator">
      <div class="generator-head"><div><h2>RANDOM MISSION GENERATOR</h2><p>Theme loop: DAY → SUNSET → NIGHT → DAY. Later overlapping rules take priority.</p></div><button @click="addRangeRule">＋ ADD RANGE RULE</button></div>
      <div class="generator-settings">
        <label><span>MISSION COUNT (1–1000)</span><input v-model.number="generateCount" type="number" min="1" max="1000"></label>
        <label><span>RANDOM SEED</span><input v-model="generateSeed" type="text"></label>
        <button class="generate" @click="generateLevels">GENERATE {{ generateCount }} MISSIONS</button>
      </div>
      <div v-if="!rangeRules.length" class="empty-rules">NO CUSTOM RULES · DAY / SUNSET / NIGHT REPEATS EVERY 3 MISSIONS</div>
      <div v-for="rule in rangeRules" :key="rule.uid" class="range-rule">
        <label><span>FROM</span><input v-model.number="rule.startLevel" type="number" min="1"></label>
        <label><span>TO</span><input v-model.number="rule.endLevel" type="number" min="1"></label>
        <label><span>DIFFICULTY</span><select v-model="rule.difficulty"><option value="easy">EASY</option><option value="normal">NORMAL</option><option value="hard">HARD</option></select></label>
        <label><span>THEME</span><select v-model="rule.theme"><option value="mixed">MIXED</option><option value="day">DAY</option><option value="sunset">SUNSET</option><option value="night">NIGHT</option></select></label>
        <label><span>PIPE RULE</span><select v-model="rule.pipePattern"><option value="mixed">MIXED</option><option value="random">RANDOM</option><option value="alternating">ALTERNATING</option><option value="wave">WAVE</option></select></label>
        <button class="danger" @click="removeRangeRule(rule.uid)">DELETE</button>
      </div>
    </section>
    <section class="workspace">
      <aside>
        <div class="aside-title"><b>MISSION LIST</b><button @click="addLevel">＋</button></div>
        <button v-for="(level, i) in levels" :key="level.id" class="level" :class="{active:i===selected}" @click="selected=i">
          <span>MISSION {{ level.id }} · {{ level.theme }}</span>
          <small>{{ level.pipePattern }} · PIPE {{ level.pipeSpeed }} · AIR {{ level.flapVelocity }}</small>
        </button>
      </aside>

      <div v-if="current" class="editor">
        <div class="toolbar"><h2>MISSION {{ current.id }}</h2><div><button @click="duplicate">DUPLICATE</button><button class="danger" @click="remove">DELETE</button></div></div>
        <div class="grid">
          <label><span>LEVEL ID</span><input v-model.number="current.id" type="number" min="1"></label>
          <label><span>BACKGROUND THEME</span><select v-model="current.theme"><option value="day">DAY</option><option value="sunset">SUNSET</option><option value="night">NIGHT</option></select></label>
          <label><span>PIPE SPAWN RULE</span><select v-model="current.pipePattern"><option value="random">RANDOM</option><option value="alternating">ALTERNATING</option><option value="wave">WAVE</option></select></label>
          <label v-for="field in fields" :key="field[0]"><span>{{ field[1] }}</span><input v-model.number="current[field[0]]" type="number" :step="field[2]"></label>
          <label class="check"><input v-model="current.specialObstacles" type="checkbox"><span>ENABLE SPECIAL OBSTACLES</span></label>
        </div>
      </div>

      <div v-if="current" class="preview-wrap">
        <h3>LIVE PREVIEW</h3>
        <div class="preview" :class="`theme-${current.theme}`">
          <div class="cloud c1"></div><div class="cloud c2"></div>
          <div class="pipe top" :style="{height:`${(640-current.gapSize/2)/4}px`}"></div>
          <div class="plane">✦</div>
          <div class="pipe bottom" :style="{height:`${(640-current.gapSize/2)/4}px`}"></div>
          <div class="ground"></div>
        </div>
        <dl><div><dt>CLEAR</dt><dd>{{ current.targetScore }} PTS</dd></div><div><dt>RULE</dt><dd>{{ current.pipePattern }}</dd></div><div><dt>AIR / PIPE</dt><dd>{{ current.flapVelocity }} / {{ current.pipeSpeed }}</dd></div></dl>
      </div>
    </section>
  </main>
</template>
