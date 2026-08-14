<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

type LevelRow = Record<string, string>;
type Grid = boolean[];

const ROWS = 8;
const COLS = 8;
const CELL_COUNT = ROWS * COLS;
const FULL_MASK = '1'.repeat(CELL_COUNT);
const columns = ['ID', 'name', 'cakes', 'targets', 'limit', 'stars', 'golds', 'boardMask', 'propReward'];
const comments = ['关卡ID', '关卡名称', '随机元素种类（至少3色）', '消除目标', '关卡步数', '3星要求', '金币奖励', '棋盘形状64位掩码', '首次通关道具奖励'];
const types = ['number', 'string', 'string', 'string', 'number', 'string', 'string', 'string', 'string'];
const cakeOptions = Array.from({ length: 8 }, (_, index) => `cake0${index + 1}`);
const propOptions = [
  ['none', '无奖励'], ['random', '随机（锤子/魔法棒/刷新）'],
  ['1', '锤子'], ['2', '魔法棒'], ['3', '刷新'], ['4', '无限道具'],
];
const presetOptions = [
  ['full', '完整'], ['diamond', '菱形'], ['cross', '十字'], ['rounded', '圆角'], ['ring', '圆环'],
  ['hourglass', '沙漏'], ['h', 'H形'], ['stairs', '阶梯'], ['islands', '双岛'],
];

const rows = ref<LevelRow[]>([]);
const selectedId = ref(1);
const draft = ref<LevelRow>({});
const grid = ref<Grid>(Array(CELL_COUNT).fill(true));
const notice = ref('正在读取 level.csv…');
const dirty = ref(false);
const batchPending = ref(false);
const batchStart = ref(1);
const batchCount = ref(50);
const batchShape = ref('random');
const batchColors = ref(3);
const batchReward = ref('random');
const batchRewardAmount = ref(1);

const selectedCakes = computed(() => new Set(String(draft.value.cakes || '').split('|').filter(Boolean)));
const rewardType = computed({
  get: () => String(draft.value.propReward || 'none').split(':')[0],
  set: (value: string) => setReward(value, rewardAmount.value),
});
const rewardAmount = computed({
  get: () => Math.max(1, Number(String(draft.value.propReward || 'none:1').split(':')[1]) || 1),
  set: (value: number) => setReward(rewardType.value, value),
});

const activeCount = computed(() => grid.value.filter(Boolean).length);
const playableChain = computed(() => findPlayableChain(grid.value));
const errors = computed(() => {
  const result: string[] = [];
  if (selectedCakes.value.size < 3) result.push('至少选择 3 种元素');
  if (activeCount.value < 3) result.push('棋盘至少需要 3 个有效格子');
  if (playableChain.value.length !== 3) result.push('形状中不存在可连接消除的 3 个相邻格');
  const targetCakes = String(draft.value.targets || '').split('|').map((item) => item.split('-')[0]).filter(Boolean);
  if (targetCakes.some((cake) => !selectedCakes.value.has(cake))) result.push('消除目标包含未启用的颜色');
  return result;
});

function parseCsv(csv: string): LevelRow[] {
  const lines = csv.replace(/^\uFEFF/, '').trim().split(/\r?\n/);
  const sourceColumns = lines[2].split(',');
  return lines.slice(3).filter(Boolean).map((line) => {
    const values = line.split(',');
    const row: LevelRow = {};
    sourceColumns.forEach((column, index) => row[column] = values[index] ?? '');
    row.boardMask = normalizeMask(row.boardMask);
    row.propReward ||= 'none';
    return row;
  });
}

function serializeCsv(): string {
  const data = [...rows.value].sort((a, b) => Number(a.ID) - Number(b.ID));
  return [comments.join(','), types.join(','), columns.join(','), ...data.map((row) =>
    columns.map((column) => row[column] ?? '').join(','))].join('\n') + '\n';
}

function normalizeMask(value: string | undefined): string {
  const mask = String(value || '').replace(/[^01]/g, '');
  return mask.length === CELL_COUNT ? mask : FULL_MASK;
}

function loadLevel(id: number): void {
  commitDraft();
  const level = rows.value.find((row) => Number(row.ID) === id);
  if (!level) {
    notice.value = `没有第 ${id} 关`;
    return;
  }
  selectedId.value = id;
  batchStart.value = id;
  draft.value = { ...level };
  grid.value = normalizeMask(level.boardMask).split('').map((cell) => cell === '1');
  dirty.value = false;
  notice.value = `已载入第 ${id} 关`;
}

function commitDraft(): void {
  if (!draft.value.ID || !dirty.value) return;
  draft.value.boardMask = grid.value.map((cell) => cell ? '1' : '0').join('');
  const index = rows.value.findIndex((row) => row.ID === draft.value.ID);
  if (index >= 0) rows.value[index] = { ...draft.value };
}

function markDirty(): void {
  dirty.value = true;
}

function toggleCake(cake: string): void {
  const next = new Set(selectedCakes.value);
  if (next.has(cake)) {
    if (next.size <= 3) {
      notice.value = '消除规则要求最低 3 色';
      return;
    }
    next.delete(cake);
  } else {
    next.add(cake);
  }
  draft.value.cakes = cakeOptions.filter((item) => next.has(item)).join('|');
  markDirty();
}

function setReward(type: string, amount: number): void {
  draft.value.propReward = type === 'none' ? 'none' : `${type}:${Math.max(1, Math.floor(amount || 1))}`;
  markDirty();
}

function toggleCell(displayIndex: number): void {
  const displayRow = Math.floor(displayIndex / COLS);
  const column = displayIndex % COLS;
  const row = ROWS - 1 - displayRow;
  const index = row * COLS + column;
  grid.value[index] = !grid.value[index];
  grid.value = [...grid.value];
  markDirty();
}

function isDisplayCellActive(displayIndex: number): boolean {
  const row = ROWS - 1 - Math.floor(displayIndex / COLS);
  return grid.value[row * COLS + displayIndex % COLS];
}

function neighbors(index: number): number[] {
  const row = Math.floor(index / COLS);
  const column = index % COLS;
  const result: number[] = [];
  for (let y = row - 1; y <= row + 1; y++) {
    for (let x = column - 1; x <= column + 1; x++) {
      if (x < 0 || y < 0 || x >= COLS || y >= ROWS || (x === column && y === row)) continue;
      result.push(y * COLS + x);
    }
  }
  return result;
}

function findPlayableChain(mask: Grid): number[] {
  for (let index = 0; index < mask.length; index++) {
    if (!mask[index]) continue;
    const activeNeighbors = neighbors(index).filter((neighbor) => mask[neighbor]);
    if (activeNeighbors.length >= 2) return [index, activeNeighbors[0], activeNeighbors[1]];
  }
  return [];
}

function presetMask(name: string): Grid {
  return Array.from({ length: CELL_COUNT }, (_, index) => {
    const row = Math.floor(index / COLS);
    const column = index % COLS;
    const x = Math.abs(column - 3.5);
    const y = Math.abs(row - 3.5);
    if (name === 'full') return true;
    if (name === 'diamond') return x + y <= 4;
    if (name === 'cross') return (row >= 2 && row <= 5) || (column >= 2 && column <= 5);
    if (name === 'rounded') return !((row === 0 || row === 7) && (column === 0 || column === 7));
    if (name === 'ring') return x + y >= 2 && x + y <= 5;
    if (name === 'hourglass') return x <= Math.max(1, Math.floor(y));
    if (name === 'h') return column <= 1 || column >= 6 || row === 3 || row === 4;
    if (name === 'stairs') return column >= row - 1 && column <= row + 4;
    if (name === 'islands') return (row <= 2 && column <= 3) || (row >= 5 && column >= 4);
    return true;
  });
}

function applyPreset(name: string): void {
  grid.value = presetMask(name);
  markDirty();
}

function generateBatch(): void {
  commitDraft();
  const start = Math.max(1, Math.floor(batchStart.value || 1));
  const count = Math.min(5000, Math.max(1, Math.floor(batchCount.value || 1)));
  const end = start + count - 1;
  if (rows.value.some((row) => Number(row.ID) >= start && Number(row.ID) <= end)
    && !window.confirm(`第 ${start}-${end} 关中已有数据，确定覆盖同 ID 关卡吗？`)) return;

  const template = { ...draft.value };
  const targetAmount = Math.max(1, Number(String(template.targets || '').split('-')[1]) || 10);
  const presetNames = presetOptions.map(([name]) => name);
  for (let id = start; id <= end; id++) {
    const cakes = [...cakeOptions].sort(() => Math.random() - .5).slice(0, Math.min(8, Math.max(3, batchColors.value)));
    const shape = batchShape.value === 'random'
      ? presetNames[Math.floor(Math.random() * presetNames.length)]
      : batchShape.value;
    const row = {
      ...template,
      ID: String(id),
      name: String(id),
      cakes: cakes.join('|'),
      targets: `${cakes[0]}-${targetAmount}`,
      boardMask: presetMask(shape).map((cell) => cell ? '1' : '0').join(''),
      propReward: batchReward.value === 'none' ? 'none' : `${batchReward.value}:${Math.max(1, batchRewardAmount.value)}`,
    };
    const oldIndex = rows.value.findIndex((item) => Number(item.ID) === id);
    if (oldIndex >= 0) rows.value[oldIndex] = row;
    else rows.value.push(row);
  }
  rows.value.sort((a, b) => Number(a.ID) - Number(b.ID));
  batchPending.value = true;
  loadLevel(start);
  notice.value = `已批量生成第 ${start}-${end} 关，点击“保存到项目”后写入 CSV`;
}

async function saveProject(): Promise<void> {
  commitDraft();
  if (errors.value.length) {
    notice.value = `不能保存：${errors.value.join('；')}`;
    return;
  }
  const response = await fetch('/api/levels', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ csv: serializeCsv() }),
  });
  if (!response.ok) throw new Error(await response.text());
  dirty.value = false;
  batchPending.value = false;
  notice.value = `已保存到项目 level.csv`;
}

function downloadCsv(): void {
  commitDraft();
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([serializeCsv()], { type: 'text/csv;charset=utf-8' }));
  link.download = 'level.csv';
  link.click();
  URL.revokeObjectURL(link.href);
}

onMounted(async () => {
  const response = await fetch('/api/levels');
  const { csv } = await response.json() as { csv: string };
  rows.value = parseCsv(csv);
  loadLevel(Number(rows.value[0]?.ID || 1));
});
</script>

<template>
  <main>
    <header>
      <div>
        <p>PUZZLE COHE LUCKY</p>
        <h1>关卡编辑器</h1>
        <span>八方向同色连线 · 至少连接 3 个 · 最低 3 色</span>
      </div>
      <div class="level-nav">
        <button @click="loadLevel(Math.max(1, selectedId - 1))">上一关</button>
        <label>关卡 <input v-model.number="selectedId" type="number" min="1" :max="rows.length" @change="loadLevel(selectedId)" /></label>
        <button @click="loadLevel(Math.min(rows.length, selectedId + 1))">下一关</button>
      </div>
    </header>

    <section class="panel batch-panel">
      <div class="panel-title"><h2>批量生成关卡</h2><b>生成后仍可逐关修改</b></div>
      <div class="batch-fields">
        <label>起始关卡<input v-model.number="batchStart" type="number" min="1" /></label>
        <label>生成数量<input v-model.number="batchCount" type="number" min="1" max="5000" /></label>
        <label>棋盘形状<select v-model="batchShape"><option value="random">随机形状</option><option v-for="option in presetOptions" :key="option[0]" :value="option[0]">{{ option[1] }}</option></select></label>
        <label>元素种类数<input v-model.number="batchColors" type="number" min="3" max="8" /></label>
        <label>首次通关道具<select v-model="batchReward"><option v-for="option in propOptions" :key="option[0]" :value="option[0]">{{ option[1] }}</option></select></label>
        <label>道具数量<input v-model.number="batchRewardAmount" type="number" min="1" max="99" /></label>
        <button class="primary" @click="generateBatch">批量生成</button>
      </div>
      <p class="hint">步数、目标数量、星级和金币沿用当前关卡；形状可随机，元素每关随机抽取且不会少于 3 种。</p>
    </section>

    <section class="workspace">
      <article class="panel board-panel">
        <div class="panel-title"><h2>棋盘形状</h2><b>{{ activeCount }}/64 格</b></div>
        <div class="presets">
          <button v-for="preset in presetOptions" :key="preset[0]" @click="applyPreset(preset[0])">{{ preset[1] }}</button>
        </div>
        <div class="board">
          <button v-for="index in CELL_COUNT" :key="index" class="cell" :class="{ active: isDisplayCellActive(index - 1) }" @click="toggleCell(index - 1)" />
        </div>
        <p class="hint">点击格子可手工微调。紫色格会生成元素；透明区域是真正的洞，掉落会跳过。</p>
      </article>

      <article class="panel settings">
        <div class="panel-title"><h2>第 {{ selectedId }} 关配置</h2><i :class="{ dirty: dirty || batchPending }">{{ dirty || batchPending ? '未保存' : '已同步' }}</i></div>

        <label>元素种类（最低 3 种）</label>
        <div class="cakes">
          <button v-for="(cake, index) in cakeOptions" :key="cake" :class="[`cake-${index + 1}`, { selected: selectedCakes.has(cake) }]" @click="toggleCake(cake)">{{ index + 1 }}</button>
        </div>

        <div class="fields">
          <label>消除目标<input v-model="draft.targets" @input="markDirty" /></label>
          <label>步数<input v-model="draft.limit" type="number" min="1" @input="markDirty" /></label>
          <label>星级分数<input v-model="draft.stars" @input="markDirty" /></label>
          <label>金币奖励<input v-model="draft.golds" @input="markDirty" /></label>
        </div>

        <div class="reward">
          <h3>首次通关道具</h3>
          <select v-model="rewardType">
            <option v-for="option in propOptions" :key="option[0]" :value="option[0]">{{ option[1] }}</option>
          </select>
          <label v-if="rewardType !== 'none'">数量<input v-model.number="rewardAmount" type="number" min="1" max="99" /></label>
        </div>

        <ul v-if="errors.length" class="errors"><li v-for="error in errors" :key="error">{{ error }}</li></ul>
        <div class="actions">
          <button class="primary" :disabled="errors.length > 0" @click="saveProject">保存到项目</button>
          <button @click="downloadCsv">下载 CSV</button>
        </div>
        <p class="notice">{{ notice }}</p>
      </article>
    </section>
  </main>
</template>
