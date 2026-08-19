<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';

interface Level {
  id: number; name: string; ringSpawnInterval: number; ringSpeed: number; ringRadius: number;
  ringRandomY: number; backgroundSpeed: number; movingRingChance: number;
  shrinkingRingChance: number; powerUpChance: number; targetScore: number;
  difficultyEvery: number; difficultySpeedStep: number;
}

const seed: Level[] = [
  { id: 1, name: '蓝天巡航', ringSpawnInterval: 1.8, ringSpeed: 260, ringRadius: 92, ringRandomY: 220, backgroundSpeed: 45, movingRingChance: .12, shrinkingRingChance: .08, powerUpChance: .08, targetScore: 20, difficultyEvery: 5, difficultySpeedStep: 16 },
  { id: 2, name: '落日乱流', ringSpawnInterval: 1.45, ringSpeed: 310, ringRadius: 82, ringRandomY: 235, backgroundSpeed: 62, movingRingChance: .24, shrinkingRingChance: .16, powerUpChance: .1, targetScore: 30, difficultyEvery: 4, difficultySpeedStep: 20 },
  { id: 3, name: '王牌航线', ringSpawnInterval: 1.15, ringSpeed: 360, ringRadius: 74, ringRandomY: 245, backgroundSpeed: 78, movingRingChance: .3, shrinkingRingChance: .24, powerUpChance: .12, targetScore: 45, difficultyEvery: 3, difficultySpeedStep: 22 },
];

const levels = ref<Level[]>(structuredClone(seed));
const selectedId = ref(1);
const canvas = ref<HTMLCanvasElement>();
const toast = ref('');
const current = computed(() => levels.value.find(level => level.id === selectedId.value) ?? levels.value[0]);
const difficulty = computed(() => Math.round((current.value.ringSpeed / 90 + 2 / current.value.ringSpawnInterval + current.value.movingRingChance * 4 + current.value.shrinkingRingChance * 5) * 10));
const errors = computed(() => {
  const l = current.value; const result: string[] = [];
  if (!l.name.trim()) result.push('关卡名称不能为空');
  if (l.ringRadius < 50 || l.ringRadius > 140) result.push('圆环半径应在 50–140');
  if (l.ringRandomY + l.ringRadius > 340) result.push('随机高度 + 半径不能超过 340，否则圆环会越界');
  if ([l.movingRingChance, l.shrinkingRingChance, l.powerUpChance].some(v => v < 0 || v > 1)) result.push('概率必须在 0–1');
  if (l.movingRingChance + l.shrinkingRingChance > 1) result.push('移动环与缩小环概率之和不能超过 1');
  return result;
});

const fields: { key: keyof Level; label: string; min: number; max: number; step: number; unit: string }[] = [
  { key: 'ringSpawnInterval', label: '生成间隔', min: .7, max: 4, step: .05, unit: '秒' },
  { key: 'ringSpeed', label: '圆环速度', min: 120, max: 600, step: 5, unit: 'px/s' },
  { key: 'ringRadius', label: '圆环半径', min: 50, max: 140, step: 1, unit: 'px' },
  { key: 'ringRandomY', label: '上下随机范围', min: 0, max: 250, step: 5, unit: 'px' },
  { key: 'backgroundSpeed', label: '背景速度', min: 0, max: 150, step: 5, unit: 'px/s' },
  { key: 'movingRingChance', label: '移动环概率', min: 0, max: 1, step: .01, unit: '%' },
  { key: 'shrinkingRingChance', label: '缩小环概率', min: 0, max: 1, step: .01, unit: '%' },
  { key: 'powerUpChance', label: '道具概率', min: 0, max: 1, step: .01, unit: '%' },
  { key: 'targetScore', label: '目标分数', min: 1, max: 999, step: 1, unit: '分' },
  { key: 'difficultyEvery', label: '难度提升间隔', min: 1, max: 30, step: 1, unit: '环' },
  { key: 'difficultySpeedStep', label: '每档速度增量', min: 0, max: 100, step: 1, unit: 'px/s' },
];

function addLevel() {
  const id = Math.max(0, ...levels.value.map(l => l.id)) + 1;
  levels.value.push({ ...current.value, id, name: `新航线 ${id}` }); selectedId.value = id;
}
function cloneLevel() {
  const source = { ...current.value }; const id = Math.max(0, ...levels.value.map(l => l.id)) + 1;
  levels.value.push({ ...source, id, name: `${source.name} 副本` }); selectedId.value = id;
}
function removeLevel() {
  if (levels.value.length === 1) return flash('至少保留一个关卡');
  const index = levels.value.findIndex(l => l.id === selectedId.value); levels.value.splice(index, 1);
  selectedId.value = levels.value[Math.max(0, index - 1)].id;
}
function exportJson() {
  if (errors.value.length) return flash('请先修复配置错误');
  const blob = new Blob([JSON.stringify({ levels: levels.value }, null, 2)], { type: 'application/json' });
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'levels.json'; link.click(); URL.revokeObjectURL(link.href); flash('已导出 levels.json');
}
function importJson(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]; if (!file) return;
  const reader = new FileReader(); reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result)) as { levels: Level[] };
      if (!Array.isArray(parsed.levels) || !parsed.levels.length) throw new Error();
      levels.value = parsed.levels; selectedId.value = levels.value[0].id; flash(`已导入 ${levels.value.length} 个关卡`);
    } catch { flash('JSON 格式无效'); }
  }; reader.readAsText(file); (event.target as HTMLInputElement).value = '';
}
function flash(message: string) { toast.value = message; window.setTimeout(() => { if (toast.value === message) toast.value = ''; }, 2200); }

function draw() {
  const el = canvas.value; if (!el) return; const ctx = el.getContext('2d'); if (!ctx) return;
  const ratio = devicePixelRatio; const width = el.clientWidth; const height = el.clientHeight;
  el.width = width * ratio; el.height = height * ratio; ctx.scale(ratio, ratio); ctx.imageSmoothingEnabled = false;
  const sky = ctx.createLinearGradient(0, 0, 0, height); sky.addColorStop(0, '#4ba9dc'); sky.addColorStop(1, '#bde8ef'); ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#dff8ff'; for (let x = 50; x < width; x += 250) { ctx.fillRect(x, 66, 88, 18); ctx.fillRect(x + 18, 50, 50, 18); }
  ctx.fillStyle = '#5d7792'; for (let x = -30; x < width; x += 160) { ctx.beginPath(); ctx.moveTo(x, height - 42); ctx.lineTo(x + 78, height - 130); ctx.lineTo(x + 155, height - 42); ctx.fill(); }
  ctx.fillStyle = '#29484c'; ctx.fillRect(0, height - 42, width, 42);
  const l = current.value; const scale = Math.min(width / 900, height / 520); const cy = height / 2 - l.ringRandomY * scale * .35;
  const rings = [width * .55, width * .76, width * .94];
  rings.forEach((x, i) => { ctx.strokeStyle = i === 1 ? '#67e7ff' : '#f6b83f'; ctx.lineWidth = Math.max(8, 14 * scale); ctx.beginPath(); ctx.arc(x, cy + i * 55, l.ringRadius * scale, 0, Math.PI * 2); ctx.stroke(); ctx.strokeStyle = '#fff18a'; ctx.lineWidth = 2; ctx.stroke(); });
  const px = width * .2, py = height / 2; ctx.fillStyle = '#718348'; ctx.fillRect(px - 44, py - 10, 82, 20); ctx.fillRect(px - 12, py - 25, 35, 50); ctx.fillStyle = '#d85832'; ctx.fillRect(px + 36, py - 13, 8, 26); ctx.fillStyle = '#fff18a'; ctx.fillRect(px + 48, py - 25, 4, 50);
  ctx.strokeStyle = '#ffffff55'; ctx.setLineDash([5, 6]); ctx.beginPath(); ctx.moveTo(0, height / 2 - l.ringRandomY * scale); ctx.lineTo(width, height / 2 - l.ringRandomY * scale); ctx.moveTo(0, height / 2 + l.ringRandomY * scale); ctx.lineTo(width, height / 2 + l.ringRandomY * scale); ctx.stroke(); ctx.setLineDash([]);
}

watch(levels, () => nextTick(draw), { deep: true });
watch(selectedId, () => nextTick(draw));
onMounted(() => { draw(); new ResizeObserver(draw).observe(canvas.value!); });
</script>

<template>
  <main class="shell">
    <header>
      <div><p class="eyebrow">RING AVIATORX</p><h1>航线控制台</h1></div>
      <div class="actions"><label class="button ghost">导入 JSON<input type="file" accept="application/json" @change="importJson"></label><button class="button primary" @click="exportJson">导出关卡</button></div>
    </header>
    <section class="workspace">
      <aside class="level-list">
        <div class="section-title"><span>关卡</span><button title="新增关卡" @click="addLevel">＋</button></div>
        <button v-for="level in levels" :key="level.id" class="level-card" :class="{ active: level.id === selectedId }" @click="selectedId = level.id">
          <span class="level-number">{{ String(level.id).padStart(2, '0') }}</span><span><b>{{ level.name }}</b><small>{{ level.ringSpeed }} px/s · {{ level.ringRadius }} px</small></span>
        </button>
        <div class="list-actions"><button @click="cloneLevel">复制</button><button class="danger" @click="removeLevel">删除</button></div>
      </aside>
      <section class="center">
        <div class="preview-card">
          <div class="card-head"><span>实时航线预览</span><span class="badge">难度 {{ difficulty }}</span></div><canvas ref="canvas"></canvas>
          <div class="metrics"><span><b>{{ current.ringSpawnInterval }}</b> 秒/环</span><span><b>{{ current.ringSpeed }}</b> 飞行速度</span><span><b>{{ Math.round((current.movingRingChance + current.shrinkingRingChance) * 100) }}%</b> 变体环</span><span><b>{{ current.targetScore }}</b> 目标分</span></div>
        </div>
        <div v-if="errors.length" class="errors"><b>配置需要调整</b><span v-for="error in errors" :key="error">{{ error }}</span></div>
        <div v-else class="valid">✓ 配置有效，可直接导出到 Cocos Creator</div>
      </section>
      <aside class="inspector">
        <div class="section-title"><span>关卡参数</span><span>#{{ current.id }}</span></div>
        <label class="name-field"><span>航线名称</span><input v-model.trim="current.name"></label>
        <label v-for="field in fields" :key="field.key" class="field">
          <span>{{ field.label }} <em>{{ field.unit === '%' ? Math.round(Number(current[field.key]) * 100) + '%' : current[field.key] + ' ' + field.unit }}</em></span>
          <input v-model.number="current[field.key]" type="range" :min="field.min" :max="field.max" :step="field.step">
        </label>
      </aside>
    </section>
    <div v-if="toast" class="toast">{{ toast }}</div>
  </main>
</template>
