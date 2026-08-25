<script setup>
import { computed, reactive, ref, watch } from 'vue';
import JSZip from 'jszip';
import { createLevel, DIFFICULTIES, SHAPES, validateLevel } from './generator.js';

const settings = reactive({
  startLevel: 1,
  count: 100,
  seed: String(Date.now()),
  columns: 25,
  rows: 38,
  shape: 'mixed',
  tools: { remove: 3, hint: 3, bomb: 3 },
  rewardType: 'random',
  rewardAmount: 1,
});
const previewId = ref(1);
const rules = ref([]);
const customMask = ref(emptyMask());
const notice = ref('设置参数后可下载单关 JSON 或批量 ZIP。');
let nextRuleId = 1;

function emptyMask() {
  return Array.from({ length: settings?.rows ?? 38 }, () => '0'.repeat(settings?.columns ?? 25));
}

const generationSettings = computed(() => ({ ...settings, tools: { ...settings.tools }, customMask: customMask.value }));
const preview = computed(() => createLevel(clamp(previewId.value, settings.startLevel, settings.startLevel + settings.count - 1), generationSettings.value, rules.value));
const validation = computed(() => validateLevel(preview.value));
const svgPaths = computed(() => preview.value.paths.map((path) => ({
  ...path,
  svg: path.points.map(([x, y]) => `${x + 0.5},${settings.rows - y - 0.5}`).join(' '),
  head: path.points[path.points.length - 1],
})));

watch(() => [settings.columns, settings.rows], () => {
  customMask.value = emptyMask();
});
watch(() => settings.startLevel, (value) => { previewId.value = value; });

function addRule() {
  rules.value.push({
    uid: nextRuleId++, start: settings.startLevel, end: settings.startLevel + Math.min(9, settings.count - 1),
    difficulty: 'easy', shape: 'heart', time: 360, remove: 3, hint: 3, bomb: 1,
    rewardType: 'none', rewardAmount: 1,
  });
}

function removeRule(uid) {
  rules.value = rules.value.filter((rule) => rule.uid !== uid);
}

function randomize() {
  settings.seed = String(Date.now());
  notice.value = `已换用随机种子 ${settings.seed}`;
}

function toggleCustom(event) {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = Math.floor((event.clientX - rect.left) / rect.width * settings.columns);
  const visualY = Math.floor((event.clientY - rect.top) / rect.height * settings.rows);
  const y = settings.rows - 1 - visualY;
  if (x < 0 || x >= settings.columns || y < 0 || y >= settings.rows) return;
  const rows = [...customMask.value];
  const row = rows[y].split('');
  row[x] = row[x] === '1' ? '0' : '1';
  rows[y] = row.join('');
  customMask.value = rows;
  settings.shape = 'custom';
}

function downloadCurrent() {
  if (validation.value) return;
  download(`${levelName(preview.value.level)}.json`, JSON.stringify(preview.value, null, 2));
}

async function downloadBatch() {
  const count = clamp(settings.count, 1, 10000);
  const zip = new JSZip();
  for (let offset = 0; offset < count; offset++) {
    const level = createLevel(settings.startLevel + offset, generationSettings.value, rules.value);
    const error = validateLevel(level);
    if (error) { notice.value = `第 ${level.level} 关生成失败：${error}`; return; }
    zip.file(`${levelName(level.level)}.json`, JSON.stringify(level, null, 2));
  }
  notice.value = `正在打包 ${count} 关…`;
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  download(`arrow_levels_${settings.startLevel}_${settings.startLevel + count - 1}.zip`, blob);
  notice.value = `已生成 ${count} 关。`;
}

function download(name, content) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = name; anchor.click();
  URL.revokeObjectURL(url);
}

function levelName(id) { return `level_${String(id).padStart(3, '0')}`; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, Math.floor(Number(value) || min))); }
</script>

<template>
  <main class="shell">
    <header class="hero">
      <div><span>ARROW PATH PUZZLE</span><h1>关卡批量生成器</h1><p>独立 Vue 工具 · 形状、难度、道具与奖励按关卡配置</p></div>
      <button class="random" @click="randomize">换一个随机种子</button>
    </header>

    <section class="workspace">
      <article class="panel preview-panel">
        <div class="panel-title"><div><b>关卡预览</b><small>{{ preview.grid.columns }}×{{ preview.grid.rows }} · {{ preview.paths.length }} 条路径</small></div><label>预览关卡 <input v-model.number="previewId" type="number" :min="settings.startLevel" :max="settings.startLevel + settings.count - 1"></label></div>
        <div class="board-wrap">
          <svg class="board" :viewBox="`0 0 ${settings.columns} ${settings.rows}`" @click="toggleCustom">
            <defs><pattern id="grid" width="1" height="1" patternUnits="userSpaceOnUse"><path d="M 1 0 L 0 0 0 1" fill="none" stroke="#d9e6ed" stroke-width=".045" /></pattern></defs>
            <rect width="100%" height="100%" fill="#fff"/><rect width="100%" height="100%" fill="url(#grid)"/>
            <polyline v-for="path in svgPaths" :key="path.id" :points="path.svg" fill="none" stroke="#05080a" stroke-width=".34" stroke-linecap="round" stroke-linejoin="round"/>
            <circle v-for="path in svgPaths" :key="`h${path.id}`" :cx="path.head[0] + .5" :cy="settings.rows - path.head[1] - .5" r=".28" fill="#05080a"/>
          </svg>
        </div>
        <div class="stats"><span><b>{{ preview.level }}</b>关卡</span><span><b>{{ preview.difficulty }}</b>难度</span><span><b>{{ preview.shape }}</b>形状</span><span><b>{{ preview.timeLimit }}s</b>时间</span></div>
        <p class="tip">选择“自定义轮廓”后，直接点击预览网格开关格子。</p>
        <pre>{{ JSON.stringify(preview, null, 2) }}</pre>
      </article>

      <aside class="panel controls">
        <h2>批量设置</h2>
        <div class="field-grid">
          <label>起始关卡<input v-model.number="settings.startLevel" type="number" min="1" max="999999"></label>
          <label>生成数量<input v-model.number="settings.count" type="number" min="1" max="10000"></label>
          <label>列数<input v-model.number="settings.columns" type="number" min="10" max="40"></label>
          <label>行数<input v-model.number="settings.rows" type="number" min="10" max="50"></label>
        </div>
        <label class="wide">随机种子<input v-model="settings.seed" type="text"></label>

        <h3>默认形状</h3>
        <div class="choice-grid"><button v-for="shape in SHAPES" :key="shape.value" :class="{ selected: settings.shape === shape.value }" @click="settings.shape = shape.value">{{ shape.label }}</button></div>

        <h3>每关初始道具</h3>
        <div class="field-grid three">
          <label>任意消除<input v-model.number="settings.tools.remove" type="number" min="0" max="99"></label>
          <label>提示<input v-model.number="settings.tools.hint" type="number" min="0" max="99"></label>
          <label>炸弹<input v-model.number="settings.tools.bomb" type="number" min="0" max="99"></label>
        </div>
        <div class="reward-row"><label>通关奖励<select v-model="settings.rewardType"><option value="none">无</option><option value="random">随机道具</option><option value="remove">任意消除</option><option value="hint">提示</option><option value="bomb">炸弹</option></select></label><label>数量<input v-model.number="settings.rewardAmount" type="number" min="1" max="99"></label></div>

        <div class="range-head"><div><h3>关卡范围规则</h3><small>后添加的重叠规则优先</small></div><button @click="addRule">＋ 添加规则</button></div>
        <p v-if="!rules.length" class="empty">尚未添加规则，将自动按前、中、后三段递增难度。</p>
        <div v-for="rule in rules" :key="rule.uid" class="rule">
          <div class="rule-top"><input v-model.number="rule.start" type="number" min="1"><span>至</span><input v-model.number="rule.end" type="number" min="1"><button @click="removeRule(rule.uid)">删除</button></div>
          <div class="field-grid">
            <label>难度<select v-model="rule.difficulty"><option v-for="item in DIFFICULTIES" :key="item.value" :value="item.value">{{ item.label }}</option></select></label>
            <label>形状<select v-model="rule.shape"><option v-for="shape in SHAPES.filter(s => s.value !== 'custom')" :key="shape.value" :value="shape.value">{{ shape.label }}</option></select></label>
            <label>时间<input v-model.number="rule.time" type="number" min="30" max="3600"></label>
            <label>奖励<select v-model="rule.rewardType"><option value="none">无</option><option value="random">随机</option><option value="remove">消除</option><option value="hint">提示</option><option value="bomb">炸弹</option></select></label>
          </div>
          <div class="field-grid three compact"><label>消除<input v-model.number="rule.remove" type="number" min="0"></label><label>提示<input v-model.number="rule.hint" type="number" min="0"></label><label>炸弹<input v-model.number="rule.bomb" type="number" min="0"></label></div>
        </div>

        <p class="notice" :class="{ error: validation }">{{ validation || notice }}</p>
        <div class="actions"><button :disabled="!!validation" @click="downloadCurrent">下载当前 JSON</button><button class="primary" :disabled="!!validation" @click="downloadBatch">批量下载 ZIP（{{ settings.count }}关）</button></div>
        <p class="path">解压到：<code>assets/resources/levels/</code></p>
      </aside>
    </section>
  </main>
</template>
