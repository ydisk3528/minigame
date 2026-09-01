<script setup>
import { computed, ref } from "vue";
import { SHAPES, allTypes, generateBatch, generateLevel, isGuaranteedSolvable, levelFilename, makeCatalog, validateLevel } from "./generateLevel.js";
import { createZip } from "./zipStore.js";

const mode = ref("single");
const form = ref({ level: 1, difficulty: "easy", shape: "heart", density: .95, groupCount: 6, typeCount: 5, layers: 2, slotCount: 7, seed: 3197, limitType: "time", timeLimit: 180, moveLimit: 30, enableSequence: false, enableSpecialCombo: false, rewardCoins: 100, star2Score: 900, star3Score: 1140, undoCount: 3, shuffleCount: 3, moveCount: 3, hintCount: 3, freezeCount: 1 });
const batchForm = ref({ batchStart: 1, maxLevel: 100, batchSeed: 3197, minGroups: 5, maxGroups: 22, minTypes: 4, maxTypes: 16, minLayers: 2, maxLayers: 6, minReward: 90, maxReward: 450, limitMode: "time", minTime: 150, maxTime: 360, minMoves: 24, maxMoves: 80, sequenceFrom: 10, specialFrom: 15, slotCount: 7, density: .95, undoCount: 3, shuffleCount: 3, moveCount: 3, hintCount: 3, freezeCount: 1, shapePool: ["rectangle", "heart", "diamond", "cross", "ring", "hourglass", "butterfly", "pyramid", "staggered"] });
const taskConfig = ref({ daily: [
  { id: "daily_day1_clear_1", day: 1, titleZh: "周一：完成1关", titleEn: "Monday: Complete 1 Level", type: "complete_levels", target: 1, reward: 60 },
  { id: "daily_day2_match_10", day: 2, titleZh: "周二：完成10次消除", titleEn: "Tuesday: Make 10 Matches", type: "matches", target: 10, reward: 70 },
  { id: "daily_day3_hint", day: 3, titleZh: "周三：使用1次提示", titleEn: "Wednesday: Use Hint Once", type: "use_prop", prop: "hint", target: 1, reward: 60 },
  { id: "daily_day4_stars", day: 4, titleZh: "周四：获得5颗星", titleEn: "Thursday: Earn 5 Stars", type: "earn_stars", target: 5, reward: 90 },
  { id: "daily_day5_combo", day: 5, titleZh: "周五：达成2连消", titleEn: "Friday: Reach a 2 Combo", type: "best_combo", target: 2, reward: 80 },
  { id: "daily_day6_freeze", day: 6, titleZh: "周六：使用1次冻结", titleEn: "Saturday: Use Freeze Once", type: "use_prop", prop: "freeze", target: 1, reward: 80 },
  { id: "daily_day7_clear_3", day: 7, titleZh: "周日：完成3关", titleEn: "Sunday: Complete 3 Levels", type: "complete_levels", target: 3, reward: 120 }
], achievements: [
  { id: "achievement_clear_1", titleZh: "初次通关", titleEn: "First Clear", type: "complete_levels", target: 1, reward: 100 },
  { id: "achievement_matches_50", titleZh: "累计完成50次消除", titleEn: "Make 50 Matches", type: "matches", target: 50, reward: 150 },
  { id: "achievement_stars_15", titleZh: "累计获得15颗星", titleEn: "Earn 15 Stars", type: "earn_stars", target: 15, reward: 200 },
  { id: "achievement_combo_2", titleZh: "达成2连消", titleEn: "Reach a 2 Combo", type: "best_combo", target: 2, reward: 120 },
  { id: "achievement_hint_3", titleZh: "累计使用3次提示", titleEn: "Use Hint 3 Times", type: "use_prop", prop: "hint", target: 3, reward: 130 },
  { id: "achievement_clear_10", titleZh: "完成10关，解锁青玉装饰", titleEn: "Clear 10 Levels: Unlock Jade Decor", type: "complete_levels", target: 10, reward: 250, rewardDecoration: "jade" },
  { id: "achievement_freeze_5", titleZh: "累计使用5次冻结", titleEn: "Use Freeze 5 Times", type: "use_prop", prop: "freeze", target: 5, reward: 180 },
  { id: "achievement_matches_200", titleZh: "累计完成200次消除", titleEn: "Make 200 Matches", type: "matches", target: 200, reward: 350 },
  { id: "achievement_stars_30", titleZh: "获得30星，解锁暖金装饰", titleEn: "Earn 30 Stars: Unlock Amber Decor", type: "earn_stars", target: 30, reward: 400, rewardDecoration: "amber" },
  { id: "achievement_clear_50", titleZh: "累计完成50关", titleEn: "Complete 50 Levels", type: "complete_levels", target: 50, reward: 600 }
] });
const level = ref(generateLevel(form.value)), batchLevels = ref([]), selectedId = ref(null), visibleLayer = ref("all"), dragging = ref(null), notice = ref("当前配置已通过逐层可解性检查。"), error = ref("");
const scale = .72, boardTop = 120;
const layers = computed(() => [...new Set(level.value.layout.map(tile => tile.layer))].sort((a, b) => b - a));
const selected = computed(() => level.value.layout.find(tile => tile.id === selectedId.value) ?? null);
const visibleTiles = computed(() => visibleLayer.value === "all" ? level.value.layout : level.value.layout.filter(tile => tile.layer === Number(visibleLayer.value)));
const solvable = computed(() => isGuaranteedSolvable(level.value));
const json = computed(() => JSON.stringify(level.value, null, 2));
const batchCatalog = computed(() => makeCatalog(batchLevels.value));

function rebuild(message = "已重新生成当前关卡。") {
  try { level.value = generateLevel(form.value); selectedId.value = null; visibleLayer.value = "all"; error.value = ""; notice.value = message; }
  catch (reason) { error.value = reason instanceof Error ? reason.message : String(reason); }
}
function chooseShape(shape) { form.value.shape = shape; rebuild(`已切换为“${SHAPES.find(item => item[0] === shape)?.[1]}”布局。`); }
function tileStyle(tile) { return { left: `${tile.x * scale}px`, top: `${(tile.y - boardTop) * scale}px`, zIndex: tile.layer * 10000 + tile.id }; }
function startDrag(tile, event) { selectedId.value = tile.id; const rect = event.currentTarget.parentElement.getBoundingClientRect(); dragging.value = { tile, offsetX: event.clientX - rect.left - tile.x * scale, offsetY: event.clientY - rect.top - (tile.y - boardTop) * scale }; event.currentTarget.setPointerCapture(event.pointerId); }
function drag(event) { if (!dragging.value) return; const rect = event.currentTarget.getBoundingClientRect(); dragging.value.tile.x = Math.round(Math.max(50, Math.min(610, (event.clientX - rect.left - dragging.value.offsetX) / scale))); dragging.value.tile.y = Math.round(Math.max(140, Math.min(728, (event.clientY - rect.top - dragging.value.offsetY) / scale + boardTop))); }
function stopDrag() { dragging.value = null; }
function downloadBlob(data, name) { const url = URL.createObjectURL(data), link = Object.assign(document.createElement("a"), { href: url, download: name }); link.click(); setTimeout(() => URL.revokeObjectURL(url), 500); }
function downloadJson(data, name) { downloadBlob(new Blob([JSON.stringify(data, null, 2) + "\n"], { type: "application/json" }), name); }
function downloadSingle() { try { validateLevel(level.value); downloadJson(level.value, levelFilename(level.value.level)); notice.value = `已导出第 ${level.value.level} 关。`; } catch (reason) { error.value = String(reason.message ?? reason); } }
async function importFile(event) { const file = event.target.files?.[0]; if (!file) return; try { const parsed = JSON.parse(await file.text()); validateLevel(parsed); level.value = parsed; Object.assign(form.value, { level: parsed.level, difficulty: parsed.difficulty ?? "normal", shape: parsed.shape ?? "rectangle", groupCount: parsed.layout.length / 3, typeCount: new Set(parsed.layout.map(tile => tile.type)).size, layers: Math.max(...parsed.layout.map(tile => tile.layer)) + 1, slotCount: parsed.slotCount, seed: parsed.seed, limitType: parsed.limitType, timeLimit: parsed.timeLimit ?? 180, moveLimit: parsed.moveLimit ?? Math.ceil(parsed.layout.length * 1.5), enableSequence: parsed.enableSequence, enableSpecialCombo: parsed.enableSpecialCombo, rewardCoins: parsed.rewardCoins, star2Score: parsed.starScores?.[1], star3Score: parsed.starScores?.[2], undoCount: parsed.props?.undo ?? 3, shuffleCount: parsed.props?.shuffle ?? 3, moveCount: parsed.props?.move ?? 3, hintCount: parsed.props?.hint ?? 3, freezeCount: parsed.props?.freeze ?? 1 }); error.value = ""; notice.value = `已导入第 ${parsed.level} 关。`; } catch (reason) { error.value = `导入失败：${reason.message ?? reason}`; } event.target.value = ""; }
function toggleBatchShape(shape) { const pool = batchForm.value.shapePool; if (pool.includes(shape)) { if (pool.length > 1) batchForm.value.shapePool = pool.filter(item => item !== shape); } else pool.push(shape); }
function buildBatch() { try { batchLevels.value = generateBatch(batchForm.value); error.value = ""; notice.value = `批量检查通过：${batchLevels.value.length} 关均存在可靠的逐层消除路径。`; } catch (reason) { batchLevels.value = []; error.value = `批量生成失败：${reason.message ?? reason}`; } }
function downloadBatch() { if (!batchLevels.value.length) buildBatch(); if (!batchLevels.value.length) return; const files = batchLevels.value.map(item => ({ name: levelFilename(item.level), data: JSON.stringify(item, null, 2) + "\n" })); files.push({ name: "catalog.json", data: JSON.stringify(batchCatalog.value, null, 2) + "\n" }); downloadBlob(createZip(files), `mahjong_levels_${batchLevels.value[0].level}-${batchCatalog.value.maxLevel}.zip`); notice.value = `ZIP 已导出：最大关卡 ${batchCatalog.value.maxLevel}，共 ${batchLevels.value.length} 个关卡配置。`; }
function addTask(category) { const prefix = category === "daily" ? "daily" : "achievement"; taskConfig.value[category].push({ id: `${prefix}_new_${Date.now()}`, titleZh: "新任务", titleEn: "New Task", type: "complete_levels", target: 1, reward: 50, ...(category === "daily" ? { day: 1 } : {}) }); }
function removeTask(category, index) { taskConfig.value[category].splice(index, 1); }
function validateTasks(config) { const items = [...(config.daily ?? []), ...(config.achievements ?? [])], ids = new Set(), types = ["complete_levels", "earn_stars", "matches", "best_combo", "use_prop"]; if (!Array.isArray(config.daily) || !Array.isArray(config.achievements)) throw new Error("配置必须包含 daily 和 achievements 数组"); for (const task of items) { if (!/^[a-z0-9_-]+$/i.test(task.id) || ids.has(task.id)) throw new Error(`任务 ID 无效或重复：${task.id}`); ids.add(task.id); if (!task.titleZh || !task.titleEn || !types.includes(task.type)) throw new Error(`任务 ${task.id} 的标题或类型无效`); if (task.type === "use_prop" && !["undo","shuffle","move","hint","freeze"].includes(task.prop)) throw new Error(`任务 ${task.id} 必须选择具体道具`); if (task.day !== undefined && (!Number.isInteger(task.day) || task.day < 1 || task.day > 7)) throw new Error(`任务 ${task.id} 的星期必须是 1～7`); if (!(Number(task.target) > 0) || Number(task.reward) < 0) throw new Error(`任务 ${task.id} 的目标或奖励无效`); } }
function downloadTasks() { try { validateTasks(taskConfig.value); downloadJson(taskConfig.value, "tasks.json"); error.value = ""; notice.value = `已导出 ${taskConfig.value.daily.length} 个每日任务和 ${taskConfig.value.achievements.length} 个成就。`; } catch (reason) { error.value = `导出失败：${reason.message ?? reason}`; } }
async function importTasks(event) { const file = event.target.files?.[0]; if (!file) return; try { const parsed = JSON.parse(await file.text()); validateTasks(parsed); taskConfig.value = parsed; error.value = ""; notice.value = "任务与成就配置导入成功。"; } catch (reason) { error.value = `导入失败：${reason.message ?? reason}`; } event.target.value = ""; }
</script>

<template>
  <main>
    <header class="hero"><div><p class="eyebrow">MAHJONG TRIPLE QUEST · LEVEL LAB</p><h1>麻将关卡编辑器</h1><p>单关卡精调与批量关卡规则分开，所有结果直接写入 JSON 配置。</p></div><div class="status" :class="{bad:error}">{{ error || notice }}</div></header>
    <nav class="mode-switch"><button :class="{selected:mode==='single'}" @click="mode='single'">单关卡编辑<span>形状、道具、星级、拖动微调</span></button><button :class="{selected:mode==='batch'}" @click="mode='batch'">批量生成<span>难度曲线、形状池、ZIP 与目录</span></button><button :class="{selected:mode==='tasks'}" @click="mode='tasks'">任务与成就<span>目标、指定道具、奖励与中英文标题</span></button></nav>

    <template v-if="mode==='single'">
      <section class="single-grid">
        <aside class="panel controls">
          <div class="panel-title"><div><small>基础规则</small><h2>第 {{ form.level }} 关配置</h2></div><label class="import">导入 JSON<input type="file" accept="application/json" @change="importFile"></label></div>
          <div class="fields"><label>关卡编号<input v-model.number="form.level" type="number" min="1"></label><label>难度<select v-model="form.difficulty"><option value="easy">简单</option><option value="normal">普通</option><option value="hard">困难</option><option value="expert">专家</option></select></label><label>三张牌组数<input v-model.number="form.groupCount" type="number" min="3" max="80"></label><label>牌型种类<input v-model.number="form.typeCount" type="number" min="3" max="34"></label><label>堆叠层数<input v-model.number="form.layers" type="number" min="1" max="8"></label><label>底部槽位<input v-model.number="form.slotCount" type="number" min="5" max="9"></label><label>堆叠密度<select v-model.number="form.density" @change="rebuild(`已切换为“${form.density === .86 ? '紧凑' : form.density === .95 ? '标准' : '宽松'}”密度，牌山预览已更新。`)"><option :value=".86">紧凑</option><option :value=".95">标准</option><option :value="1.04">宽松</option></select></label><label>随机种子<input v-model.number="form.seed" type="number"></label></div>
          <section class="group"><h3>本关限制</h3><div class="fields"><label>限制方式<select v-model="form.limitType" @change="rebuild('已切换关卡限制方式。')"><option value="time">倒计时</option><option value="moves">步数</option></select></label><label v-if="form.limitType==='time'">倒计时（秒）<input v-model.number="form.timeLimit" type="number" min="10"></label><label v-else>可用步数<input v-model.number="form.moveLimit" type="number" min="3"></label></div></section>
          <section class="group"><h3>玩法开关</h3><label class="check"><input v-model="form.enableSequence" type="checkbox">启用万、筒、条顺子</label><label class="check"><input v-model="form.enableSpecialCombo" type="checkbox">启用中发白三元组合</label></section>
          <section class="group"><h3>本关道具数量</h3><div class="prop-grid"><label>↶<span>撤回</span><input v-model.number="form.undoCount" type="number" min="0" max="99"></label><label>⌁<span>洗牌</span><input v-model.number="form.shuffleCount" type="number" min="0" max="99"></label><label>⇧<span>移出</span><input v-model.number="form.moveCount" type="number" min="0" max="99"></label><label>?<span>提示</span><input v-model.number="form.hintCount" type="number" min="0" max="99"></label><label>❄<span>冻结</span><input v-model.number="form.freezeCount" type="number" min="0" max="99"></label></div></section>
          <section class="group"><h3>奖励与星级</h3><div class="fields three"><label>通关金币<input v-model.number="form.rewardCoins" type="number" min="0"></label><label>二星分数<input v-model.number="form.star2Score" type="number" min="1"></label><label>三星分数<input v-model.number="form.star3Score" type="number" min="2"></label></div></section>
          <div class="actions"><button @click="rebuild()">重新生成预览</button><button class="primary" @click="downloadSingle">导出当前关卡</button></div>
        </aside>

        <section class="panel preview">
          <div class="panel-title"><div><small>实时牌山 · {{ form.density === .86 ? '紧凑' : form.density === .95 ? '标准' : '宽松' }}</small><h2>{{ SHAPES.find(item=>item[0]===level.shape)?.[1] }} · {{ level.layout.length }} 张 · {{ layers.length }} 层</h2></div><label>查看层级<select v-model="visibleLayer"><option value="all">全部</option><option v-for="layer in layers" :key="layer" :value="layer">第 {{ layer + 1 }} 层</option></select></label></div>
          <div class="shape-list"><button v-for="shape in SHAPES" :key="shape[0]" :class="{selected:form.shape===shape[0]}" @click="chooseShape(shape[0])">{{ shape[1] }}</button></div>
          <div v-if="selected" class="tile-editor"><strong>#{{ selected.id }}</strong><label>牌面<select v-model="selected.type"><option v-for="type in allTypes" :key="type">{{ type }}</option></select></label><label>层级<input v-model.number="selected.layer" type="number" min="0" :max="form.layers-1"></label><span>x {{ selected.x }} · y {{ selected.y }}</span></div>
          <div class="board" @pointermove="drag" @pointerup="stopDrag" @pointercancel="stopDrag"><div v-for="tile in visibleTiles" :key="tile.id" class="tile" :class="{selected:tile.id===selectedId}" :style="tileStyle(tile)" @pointerdown="startDrag(tile,$event)"><img src="/tiles/tile_base.png"><img :src="`/tiles/${tile.type}.png`"><small>L{{ tile.layer+1 }}</small></div></div>
          <p class="help" :class="{bad:!solvable}">{{ solvable ? '可解性检查通过：每一层都存在完整消除路径。' : '当前手工调整破坏了逐层消除路径，请修改牌面后再导出。' }}</p>
        </section>

        <section class="panel json"><div class="panel-title"><div><small>游戏实际读取内容</small><h2>关卡 JSON</h2></div><span>道具、形状、星级均已写入</span></div><pre>{{ json }}</pre></section>
      </section>
    </template>

    <template v-else-if="mode==='batch'">
      <section class="batch-grid">
        <aside class="panel batch-controls">
          <div class="panel-title"><div><small>批量范围</small><h2>关卡生成规则</h2></div></div>
          <div class="fields"><label>开始关卡<input v-model.number="batchForm.batchStart" type="number" min="1" max="500"></label><label>最大关卡<input v-model.number="batchForm.maxLevel" type="number" :min="batchForm.batchStart" max="500"></label><label>批量种子<input v-model.number="batchForm.batchSeed" type="number"></label><label>底部槽位<input v-model.number="batchForm.slotCount" type="number" min="5" max="9"></label></div>
          <section class="group"><h3>难度递增范围</h3><div class="range-row"><span>牌组数</span><input v-model.number="batchForm.minGroups" type="number" min="3"><b>→</b><input v-model.number="batchForm.maxGroups" type="number" min="3"></div><div class="range-row"><span>牌型种类</span><input v-model.number="batchForm.minTypes" type="number" min="3" max="34"><b>→</b><input v-model.number="batchForm.maxTypes" type="number" min="3" max="34"></div><div class="range-row"><span>堆叠层数</span><input v-model.number="batchForm.minLayers" type="number" min="1" max="8"><b>→</b><input v-model.number="batchForm.maxLayers" type="number" min="1" max="8"></div><div class="range-row"><span>奖励金币</span><input v-model.number="batchForm.minReward" type="number" min="0"><b>→</b><input v-model.number="batchForm.maxReward" type="number" min="0"></div></section>
          <section class="group"><h3>倒计时 / 步数</h3><label>批量限制方式<select v-model="batchForm.limitMode"><option value="time">全部倒计时</option><option value="moves">全部步数</option><option value="alternate">倒计时与步数交替</option></select></label><div class="range-row"><span>倒计时（秒）</span><input v-model.number="batchForm.minTime" type="number" min="10"><b>→</b><input v-model.number="batchForm.maxTime" type="number" min="10"></div><div class="range-row"><span>可用步数</span><input v-model.number="batchForm.minMoves" type="number" min="3"><b>→</b><input v-model.number="batchForm.maxMoves" type="number" min="3"></div></section>
          <section class="group"><h3>玩法启用关卡</h3><div class="fields"><label>顺子从第几关<input v-model.number="batchForm.sequenceFrom" type="number" min="1"></label><label>中发白从第几关<input v-model.number="batchForm.specialFrom" type="number" min="1"></label></div></section>
          <section class="group"><h3>每关初始道具</h3><div class="prop-grid"><label>↶<span>撤回</span><input v-model.number="batchForm.undoCount" type="number" min="0"></label><label>⌁<span>洗牌</span><input v-model.number="batchForm.shuffleCount" type="number" min="0"></label><label>⇧<span>移出</span><input v-model.number="batchForm.moveCount" type="number" min="0"></label><label>?<span>提示</span><input v-model.number="batchForm.hintCount" type="number" min="0"></label><label>❄<span>冻结</span><input v-model.number="batchForm.freezeCount" type="number" min="0"></label></div></section>
          <div class="actions"><button @click="buildBatch">生成并检查</button><button class="primary" @click="downloadBatch">下载 ZIP</button></div>
        </aside>
        <section class="panel batch-result">
          <div class="panel-title"><div><small>随机形状池</small><h2>勾选批量允许出现的形状</h2></div><strong>{{ batchForm.shapePool.length }} 种</strong></div>
          <div class="shape-list large"><button v-for="shape in SHAPES" :key="shape[0]" :class="{selected:batchForm.shapePool.includes(shape[0])}" @click="toggleBatchShape(shape[0])">{{ shape[1] }}</button></div>
          <div v-if="batchLevels.length" class="batch-summary"><div><b>{{ batchLevels.length }}</b><span>关卡数</span></div><div><b>{{ batchLevels[0].layout.length }}～{{ batchLevels.at(-1).layout.length }}</b><span>麻将数量</span></div><div><b>{{ batchLevels[0].layout.at(-1).layer+1 }}～{{ batchLevels.at(-1).layout.at(-1).layer+1 }}</b><span>堆叠层数</span></div><div><b>通过</b><span>基础可解检查</span></div></div>
          <div class="table-wrap"><table><thead><tr><th>关卡</th><th>难度</th><th>限制</th><th>形状</th><th>麻将</th><th>层数</th><th>牌型</th><th>顺子</th><th>中发白</th><th>星级阈值</th></tr></thead><tbody><tr v-for="item in batchLevels" :key="item.level"><td>{{ item.level }}</td><td>{{ {easy:'简单',normal:'普通',hard:'困难',expert:'专家'}[item.difficulty] }}</td><td>{{ item.limitType==='time' ? `${item.timeLimit}秒` : `${item.moveLimit}步` }}</td><td>{{ SHAPES.find(shape=>shape[0]===item.shape)?.[1] }}</td><td>{{ item.layout.length }}</td><td>{{ item.layout.at(-1).layer+1 }}</td><td>{{ new Set(item.layout.map(tile=>tile.type)).size }}</td><td>{{ item.enableSequence?'是':'—' }}</td><td>{{ item.enableSpecialCombo?'是':'—' }}</td><td>{{ item.starScores[1] }} / {{ item.starScores[2] }}</td></tr><tr v-if="!batchLevels.length"><td colspan="10" class="empty">点击“生成并检查”查看批量结果。ZIP 会包含全部关卡和 catalog.json。</td></tr></tbody></table></div>
        </section>
      </section>
    </template>

    <template v-else>
      <section class="panel task-editor">
        <div class="panel-title"><div><small>游戏读取 resources/config/tasks.json</small><h2>任务与成就配置</h2></div><div class="actions compact"><label class="import">导入 tasks.json<input type="file" accept="application/json" @change="importTasks"></label><button class="primary" @click="downloadTasks">导出 tasks.json</button></div></div>
        <p class="help">每日任务按星期一至星期日轮换，并按自然日重置进度和领取状态；成就是永久累计。指定成就还可以奖励青玉或暖金装饰。</p>
        <section v-for="category in ['daily','achievements']" :key="category" class="task-category">
          <div class="panel-title"><h2>{{ category==='daily' ? '每日任务' : '成就' }} · {{ taskConfig[category].length }} 项</h2><button @click="addTask(category)">新增{{ category==='daily'?'每日任务':'成就' }}</button></div>
          <article v-for="(task,index) in taskConfig[category]" :key="task.id" class="task-card">
            <label>唯一 ID<input v-model.trim="task.id" placeholder="daily_clear_3"></label>
            <label>中文标题<input v-model.trim="task.titleZh"></label>
            <label>英文标题<input v-model.trim="task.titleEn"></label>
            <label>任务类型<select v-model="task.type"><option value="complete_levels">完成关卡次数</option><option value="earn_stars">获得星星数量</option><option value="matches">完成消除次数</option><option value="best_combo">最高连消</option><option value="use_prop">使用指定道具</option></select></label>
            <label v-if="category==='daily'">星期<select v-model.number="task.day"><option v-for="day in 7" :key="day" :value="day">星期{{ ['一','二','三','四','五','六','日'][day-1] }}</option></select></label>
            <label v-if="task.type==='use_prop'">指定道具<select v-model="task.prop"><option value="undo">撤回</option><option value="shuffle">洗牌</option><option value="move">移出</option><option value="hint">提示</option><option value="freeze">冻结</option></select></label>
            <label>完成目标<input v-model.number="task.target" type="number" min="1"></label>
            <label>金币奖励<input v-model.number="task.reward" type="number" min="0"></label>
            <label v-if="category==='achievements'">装饰奖励<select v-model="task.rewardDecoration"><option value="">无</option><option value="jade">青玉装饰</option><option value="amber">暖金装饰</option></select></label>
            <button class="remove" @click="removeTask(category,index)">删除</button>
          </article>
        </section>
      </section>
    </template>
  </main>
</template>

<style scoped>
.mode-switch{grid-template-columns:repeat(3,1fr)}
.task-editor{max-width:1300px;margin:auto}
.actions.compact{margin:0;flex:none}.actions.compact>*{flex:none}
.task-category{margin-top:24px;padding-top:18px;border-top:1px solid #d8d5c8}
.task-card{display:grid;grid-template-columns:1.15fr 1.2fr 1.3fr 1.2fr .8fr .75fr .75fr auto;gap:10px;align-items:end;padding:14px;margin:10px 0;border-radius:12px;background:#eee8d9}
.task-card label{font-size:12px;color:#65786e}.task-card input,.task-card select{margin-top:5px}
.task-card .remove{background:#a64b3f;height:38px}
@media(max-width:1100px){.task-card{grid-template-columns:repeat(2,1fr)}}
@media(max-width:650px){.mode-switch{grid-template-columns:1fr}.task-card{grid-template-columns:1fr}}
</style>
