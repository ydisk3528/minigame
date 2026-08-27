<script setup>
import { computed, reactive, ref, watch } from "vue";
import { buildMask, campaignSettingsForLevel, createLevel, difficultyForLevel, DIFFICULTY, SHAPES } from "./levelFactory.js";
import { createZip } from "./zipStore.js";
import { countPossibleMoves, validateLevel } from "./levelChecks.js";

const difficultyNames = { easy: "简单", normal: "普通", hard: "困难", expert: "专家" };
const goalTypes = [["collectGem", "收集宝石"], ["breakIce", "打碎冰块"], ["breakCrate", "打碎木箱"], ["score", "达到分数"]];
const gemNames = ["蓝色", "绿色", "红色", "紫色", "橙色", "青色"];
const specialFields = [["horizontalRockets", "横向火箭", "↔", "清除整行宝石"], ["verticalRockets", "纵向火箭", "↕", "清除整列宝石"], ["bombs", "范围炸弹", "✹", "爆破周围区域"], ["rainbows", "彩虹宝石", "✦", "清除一种颜色"]];
const propFields = [["hammerCount", "锤子", "🔨"], ["magicCount", "魔法棒", "✨"], ["refreshCount", "洗牌", "🔄"], ["infiniteCount", "无限道具", "∞"]];
const obstacleFields = [["ice", "冰块", "❄", "需要消除两次"], ["chains", "锁链", "⛓", "限制宝石移动"], ["crates", "木箱", "▣", "邻近消除后破坏"], ["stones", "石块", "◆", "坚固的双层障碍"]];
const gemColors = ["#3ebdff", "#7ce35a", "#ff5e72", "#b864ff", "#ffb43c", "#56e5de"];
const config = reactive({ level: 1, rows: 8, columns: 8, difficulty: "normal", shape: "heart", matchLength: 3, moveLimit: 25, gemTypes: 6, horizontalRockets: 1, verticalRockets: 1, bombs: 1, rainbows: 0, hammerCount: 3, magicCount: 1, refreshCount: 1, infiniteCount: 0, ice: 2, chains: 0, crates: 1, stones: 0, goals: [{ type: "collectGem", gemType: 1, count: 12 }], mask: [], seed: String(Date.now()) });
const editorMode = ref("single"), batchStart = ref(1), batchCount = ref(100), autoDifficulty = ref(true);
const singleOutput = ref(null), batchLevels = ref([]), batchReport = ref([]), notice = ref("单关卡设置不会影响批量规则");
const batchSeed = ref(String(Date.now())), batchEditor = ref(null), batchEditorIndex = ref(-1);
const rules = ref([
  { id: 1, start: 1, end: 10, difficulty: "easy", matchLength: 3 },
  { id: 2, start: 11, end: 30, difficulty: "normal", matchLength: 3 },
  { id: 3, start: 31, end: 60, difficulty: "hard", matchLength: 3 },
  { id: 4, start: 61, end: 100, difficulty: "expert", matchLength: 3 },
]), shapeRules = ref([
  { id: 5, start: 1, end: 10, shapes: ["rectangle", "heart", "diamond"] },
  { id: 6, start: 11, end: 30, shapes: ["rectangle", "heart", "diamond", "staggered", "cross"] },
  { id: 7, start: 31, end: 60, shapes: ["heart", "diamond", "cross", "ring", "staggered", "pyramid"] },
  { id: 8, start: 61, end: 100, shapes: ["diamond", "cross", "ring", "hourglass", "butterfly", "pyramid", "castle", "staggered"] },
]);
let nextRuleId = 9;
const preview = computed(() => singleOutput.value ?? createLevel(config));
const mask = computed(() => config.mask), activeCount = computed(() => mask.value.flat().filter(Boolean).length);
const checks = computed(() => {
  return validateLevel(preview.value).map(item => ({ level: item.severity, text: item.message }));
});
const errors = computed(() => checks.value.filter(item => item.level === "error"));
const statusText = computed(() => errors.value.length ? `${errors.value.length} 项需要修改` : "可以导出");
const specialMap = computed(() => new Map(preview.value.initialSpecials.map(item => [`${item.row}:${item.column}`, item.specialType])));
const obstacleMap = computed(() => new Map(preview.value.obstacles.map(item => [`${item.row}:${item.column}`, item.type])));

function resetMask() { config.mask = buildMask(config.shape === "random" ? "rectangle" : config.shape, config.rows, config.columns); singleOutput.value = null; }
watch(() => [config.shape, config.rows, config.columns], resetMask, { immediate: true });
watch(() => config.difficulty, value => { const preset = DIFFICULTY[value]; config.moveLimit = preset.moves; config.gemTypes = preset.colors; config.ice = preset.ice; config.crates = preset.crates; singleOutput.value = null; });
watch(config, () => { singleOutput.value = null; }, { deep: true, flush: "sync" });
watch([rules, shapeRules], () => { batchLevels.value = []; batchReport.value = []; }, { deep: true, flush: "sync" });
function toggle(row, column) { config.mask[row][column] = config.mask[row][column] ? 0 : 1; singleOutput.value = null; }
function randomizeSeed() { config.seed = String(Date.now()); }
function randomizeBatchSeed() { batchSeed.value = String(Date.now()); }
function generate() { randomizeSeed(); singleOutput.value = createLevel(config); notice.value = `单独第 ${config.level} 关预览已生成`; }
function regenerate() { singleOutput.value = createLevel(config); notice.value = `已重新排列单独第 ${config.level} 关`; }
function addRule() { rules.value.push({ id: nextRuleId++, start: batchStart.value, end: batchStart.value + Math.max(0, batchCount.value - 1), difficulty: difficultyForLevel(batchStart.value), matchLength: 3 }); }
function addShapeRule() { shapeRules.value.push({ id: nextRuleId++, start: batchStart.value, end: batchStart.value + Math.max(0, batchCount.value - 1), shapes: SHAPES.map(item => item[0]) }); }
function toggleRuleShape(rule, shape) { if (rule.shapes.includes(shape)) { if (rule.shapes.length > 1) rule.shapes = rule.shapes.filter(item => item !== shape); } else rule.shapes.push(shape); }
function addGoal() { if (config.goals.length < 4) config.goals.push({ type: "collectGem", gemType: 0, count: 10 }); }
function removeGoal(index) { config.goals.splice(index, 1); }
function ruleForLevel(level) { return [...rules.value].reverse().find(rule => level >= Math.min(rule.start, rule.end) && level <= Math.max(rule.start, rule.end)); }
function shapeRuleForLevel(level) { return [...shapeRules.value].reverse().find(rule => level >= Math.min(rule.start, rule.end) && level <= Math.max(rule.start, rule.end)); }
function batch() { randomizeBatchSeed(); batchLevels.value = Array.from({ length: Math.max(1, batchCount.value) }, (_, index) => { const level = Number(batchStart.value) + index, rule = ruleForLevel(level), shapeRule = shapeRuleForLevel(level), automatic = campaignSettingsForLevel(level), difficulty = rule?.difficulty ?? (autoDifficulty.value ? automatic.difficulty : config.difficulty), useCurve = autoDifficulty.value && difficulty === automatic.difficulty, preset = useCurve ? automatic : rule ? { moveLimit: DIFFICULTY[difficulty].moves, gemTypes: DIFFICULTY[difficulty].colors, ice: DIFFICULTY[difficulty].ice, crates: DIFFICULTY[difficulty].crates, chains: 0, stones: 0 } : { moveLimit: config.moveLimit, gemTypes: config.gemTypes, ice: config.ice, crates: config.crates, chains: config.chains, stones: config.stones }; return createLevel({ ...config, ...preset, level, seed: batchSeed.value, autoGoals: true, difficulty, horizontalRockets: level >= 6 ? 1 : 0, verticalRockets: level >= 9 ? 1 : 0, bombs: level >= 25 ? 1 : 0, rainbows: level >= 75 ? 1 : 0, ...(rule ? { matchLength: rule.matchLength } : {}), ...(shapeRule ? { shape: "random", shapePool: shapeRule.shapes, mask: null } : {}) }); }); return batchLevels.value; }
function refreshBatchReport() { batchReport.value = batchLevels.value.map(level => ({ level: level.level, difficulty: level.difficulty, moves: level.moveLimit, possibleMoves: countPossibleMoves(level), issues: validateLevel(level) })); return batchReport.value.flatMap(item => item.issues).filter(item => item.severity === "error").length; }
function runBatchCheck() { const levels = batch(), errorCount = refreshBatchReport(), warningCount = batchReport.value.flatMap(item => item.issues).filter(item => item.severity === "warning").length; notice.value = errorCount ? `批量检查失败：${errorCount} 个错误` : `批量检查通过：${levels.length} 关，${warningCount} 个提醒`; return { levels, errorCount }; }
function filename(level) { return `level_${String(level).padStart(3, "0")}.json`; }
function makeCatalog(levels) { return { version: 1, count: levels.length, levels: levels.map(level => ({ level: level.level, file: filename(level.level), shape: level.shape, difficulty: level.difficulty })) }; }
function downloadJson(data, name) { const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })); const anchor = Object.assign(document.createElement("a"), { href: url, download: name }); anchor.click(); URL.revokeObjectURL(url); }
function downloadBlob(data, name) { const url = URL.createObjectURL(data); const anchor = Object.assign(document.createElement("a"), { href: url, download: name }); anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function downloadBatchZip() { const levels = batchLevels.value.length ? batchLevels.value : batch(); const errorCount = refreshBatchReport(); if (errorCount) return notice.value = `批量检查失败：${errorCount} 个错误`; const files = levels.map(level => ({ name: filename(level.level), data: JSON.stringify(level, null, 2) })); files.push({ name: "catalog.json", data: JSON.stringify(makeCatalog(levels), null, 2) }); downloadBlob(createZip(files), `crystal_match_levels_${levels[0].level}-${levels.at(-1).level}.zip`); notice.value = `ZIP 已生成：${levels.length} 个关卡和 catalog.json`; }
function downloadSingle() { if (errors.value.length) return notice.value = "请先修正红色检查项"; const level = singleOutput.value ?? createLevel(config); downloadJson(level, filename(level.level)); }
async function writeLevels(levels) { if (!window.showDirectoryPicker) { levels.forEach(level => downloadJson(level, filename(level.level))); return; } const directory = await window.showDirectoryPicker(); for (const level of levels) { const file = await directory.getFileHandle(filename(level.level), { create: true }); const writer = await file.createWritable(); await writer.write(JSON.stringify(level, null, 2)); await writer.close(); } if (levels.length > 1) { const file = await directory.getFileHandle("catalog.json", { create: true }); const writer = await file.createWritable(); await writer.write(JSON.stringify(makeCatalog(levels), null, 2)); await writer.close(); } notice.value = `已写入 ${levels.length} 个关卡文件`; }
function writeSingle() { if (!errors.value.length) return writeLevels([singleOutput.value ?? createLevel(config)]); notice.value = "请先修正红色检查项"; }
function writeBatch() { if (!batchLevels.value.length) batch(); return refreshBatchReport() ? notice.value = "请先修正批量红色检查项" : writeLevels(batchLevels.value); }
function openBatchLevel(levelNumber) { const index = batchLevels.value.findIndex(level => level.level === levelNumber); if (index < 0) return; const level = batchLevels.value[index], countType = (items, type, key = "type") => items.filter(item => item[key] === type).length, propCount = type => level.props?.find(item => item.type === type)?.count ?? 0; batchEditorIndex.value = index; batchEditor.value = { level: level.level, rows: level.rows, columns: level.columns, difficulty: level.difficulty, shape: level.shape, moveLimit: level.moveLimit, gemTypes: level.gemTypes, matchLength: level.matchLength, goals: level.goals.map(goal => ({ ...goal })), ice: countType(level.obstacles, 1), chains: countType(level.obstacles, 2), crates: countType(level.obstacles, 3), stones: countType(level.obstacles, 4), horizontalRockets: countType(level.initialSpecials ?? [], 1, "specialType"), verticalRockets: countType(level.initialSpecials ?? [], 2, "specialType"), bombs: countType(level.initialSpecials ?? [], 3, "specialType"), rainbows: countType(level.initialSpecials ?? [], 4, "specialType"), hammerCount: propCount("hammer"), magicCount: propCount("magic"), refreshCount: propCount("refresh"), infiniteCount: propCount("infinite") }; }
function closeBatchEditor() { batchEditor.value = null; batchEditorIndex.value = -1; }
function addBatchGoal() { if (batchEditor.value?.goals.length < 3) batchEditor.value.goals.push({ type: "collectGem", gemType: 0, count: 12 }); }
function saveBatchLevel() { const editor = batchEditor.value; if (!editor?.goals.length) return; const rebuilt = createLevel({ ...editor, seed: `${batchSeed.value}-manual-${Date.now()}`, autoGoals: false, mask: null }); batchLevels.value.splice(batchEditorIndex.value, 1, rebuilt); refreshBatchReport(); notice.value = `已单独更新第 ${rebuilt.level} 关，其他批量关卡未改变`; closeBatchEditor(); }
function cellIcon(row, column) { const obstacle = obstacleMap.value.get(`${row}:${column}`); if (obstacle) return obstacleFields[obstacle - 1]?.[2] ?? ""; const special = specialMap.value.get(`${row}:${column}`); return special ? specialFields[special - 1]?.[2] ?? "" : ""; }
function goalSummary(goal) { const name = goalTypes.find(item => item[0] === goal.type)?.[1] ?? "目标"; return goal.type === "collectGem" ? `${name} · ${gemNames[goal.gemType] ?? "宝石"} × ${goal.count}` : `${name} × ${goal.count}`; }
</script>

<template>
  <main class="app-shell">
    <header class="hero"><div><p class="eyebrow">CRYSTAL MATCH · LEVEL LAB</p><h1>关卡编辑器</h1><p>单关卡和批量规则完全分开，先选择你现在要做的事情。</p></div><div class="status-pill"><i></i>{{ editorMode==='single' ? `单关卡 · ${statusText}` : `批量规则 · ${batchReport.length ? batchReport.length+' 关已检查' : '等待检查'}` }}</div></header>
    <nav class="mode-switch" aria-label="编辑模式"><button :class="{selected:editorMode==='single'}" @click="editorMode='single'">单关卡编辑<span>手动制作某一关</span></button><button :class="{selected:editorMode==='batch'}" @click="editorMode='batch'">批量规则与检查<span>范围规则、100 关结果</span></button></nav>

    <template v-if="editorMode==='single'">
      <section class="mode-intro"><b>单关卡编辑</b><span>这里只修改下方“单独第 {{ config.level }} 关”，不会修改批量范围规则。</span></section>
      <div class="workspace">
        <section class="panel board-panel">
          <div class="panel-head"><div><span>单关卡预览</span><h2>单独第 {{ config.level }} 关棋盘</h2></div><button class="ghost" @click="resetMask">恢复默认形状</button></div>
          <div class="board-wrap"><div class="board" :style="{gridTemplateColumns:`repeat(${config.columns}, 1fr)`}" role="grid" aria-label="单关卡棋盘形状编辑器"><button v-for="(_, index) in config.rows * config.columns" :key="index" class="cell" :class="{active:mask[Math.floor(index/config.columns)]?.[index%config.columns]}" :style="mask[Math.floor(index/config.columns)]?.[index%config.columns] ? {'--gem': gemColors[preview.initialLayout[Math.floor(index/config.columns)]?.[index%config.columns] % gemColors.length]} : {}" :aria-label="`第${Math.floor(index/config.columns)+1}行第${index%config.columns+1}列`" @click="toggle(Math.floor(index/config.columns), index%config.columns)"><span>{{ cellIcon(Math.floor(index/config.columns), index%config.columns) }}</span></button></div></div>
          <div class="shape-list"><button :class="{selected:config.shape==='random'}" @click="config.shape='random'">随机轮换</button><button v-for="shape in SHAPES" :key="shape[0]" :class="{selected:config.shape===shape[0]}" @click="config.shape=shape[0]">{{ shape[1] }}</button></div>
          <p class="board-help">彩色格可以放宝石；暗色格不会参与游戏。点击任意格可开关。</p><div class="goal-preview"><span>单独第 {{ config.level }} 关目标</span><b v-for="(goal,index) in preview.goals" :key="index">{{ goalSummary(goal) }}</b></div>
          <p class="notice">{{ notice }}</p><div class="stats"><div><b>{{ activeCount }}</b><span>可用格</span></div><div><b>{{ preview.initialSpecials.length }}</b><span>特殊宝石</span></div><div><b>{{ preview.obstacles.length }}</b><span>实际障碍</span></div><div><b>{{ config.matchLength }}+</b><span>同色消除</span></div></div>
        </section>
        <aside class="panel controls-panel">
          <div class="panel-head"><div><span>单关卡设置</span><h2>手动设置一关</h2></div><strong>单独第 {{ config.level }} 关</strong></div>
          <section class="control-group"><h3>基础规则</h3><p>这些字段只属于当前单关卡。</p><div class="segment"><button v-for="(_, key) in DIFFICULTY" :key="key" :class="{selected:config.difficulty===key}" @click="config.difficulty=key">{{ difficultyNames[key] }}</button></div><div class="field-grid"><label>单独关卡编号<input v-model.number="config.level" type="number" min="1"></label><label>可移动步数<input v-model.number="config.moveLimit" type="number" min="1"></label><label>宝石颜色数量<input v-model.number="config.gemTypes" type="number" min="3" max="6"></label><label>基础消除规则<select v-model.number="config.matchLength"><option :value="3">3 个同色</option><option :value="4">4 个同色</option><option :value="5">5 个同色</option></select></label></div></section>
          <section class="control-group goal-editor"><div class="group-title"><div><h3>当前单关卡目标</h3><p>玩家必须在步数用完前完成全部目标。</p></div><button class="mini" @click="addGoal">＋ 添加目标</button></div><div v-for="(goal,index) in config.goals" :key="index" class="goal-row"><b>{{ index+1 }}</b><select v-model="goal.type" aria-label="目标类型"><option v-for="item in goalTypes" :key="item[0]" :value="item[0]">{{ item[1] }}</option></select><select v-if="goal.type==='collectGem'" v-model.number="goal.gemType" aria-label="宝石颜色"><option v-for="(name,type) in gemNames.slice(0,config.gemTypes)" :key="type" :value="type">{{ name }}</option></select><span v-else class="goal-explain">{{ goal.type==='breakIce'?'数量不能超过冰块':goal.type==='breakCrate'?'数量不能超过木箱':'建议按关卡难度设置' }}</span><input v-model.number="goal.count" aria-label="目标数量" type="number" min="1"><button class="delete" title="删除目标" @click="removeGoal(index)">×</button></div><div v-if="!config.goals.length" class="empty-rule error-empty">请添加至少一个目标</div></section>
          <details class="control-group advanced"><summary><b>当前关卡：特殊宝石</b><span>默认不用修改</span></summary><div class="item-grid"><label v-for="item in specialFields" :key="item[0]" class="item-card"><i>{{ item[2] }}</i><span><b>{{ item[1] }}</b><small>{{ item[3] }}</small></span><input v-model.number="config[item[0]]" type="number" min="0" max="20"></label></div></details>
          <details class="control-group advanced"><summary><b>当前关卡：道具与障碍</b><span>填写实际数量</span></summary><h4>道具数量</h4><div class="item-grid compact"><label v-for="item in propFields" :key="item[0]" class="item-card"><i>{{ item[2] }}</i><span><b>{{ item[1] }}</b><small>实际数量</small></span><input v-model.number="config[item[0]]" type="number" min="0" :max="item[0]==='infiniteCount'?1:99"></label></div><h4>障碍数量</h4><div class="item-grid compact"><label v-for="item in obstacleFields" :key="item[0]" class="item-card"><i>{{ item[2] }}</i><span><b>{{ item[1] }}</b><small>{{ item[3] }}</small></span><input v-model.number="config[item[0]]" type="number" min="0" max="99"></label></div></details>
          <section class="check-panel" :class="{pass:!checks.length}"><h3>当前关卡检查</h3><p v-if="!checks.length">✓ 当前单关卡没有发现问题。</p><p v-for="(item,index) in checks" :key="index" :class="item.level">{{ item.level==='error'?'✕':'!' }} {{ item.text }}</p></section>
          <button class="generate" @click="generate"><b>生成并检查单独第 {{ config.level }} 关</b><span>只刷新当前单关卡</span></button><button class="replay" @click="regenerate">当前关卡换一种排列</button>
        </aside>
      </div>
      <section class="panel export-panel"><div class="panel-head"><div><span>单关卡保存</span><h2>只保存第 {{ config.level }} 关</h2></div><div class="export-actions"><button class="cyan" :disabled="errors.length" @click="downloadSingle">下载这一关 JSON</button><button class="gold" :disabled="errors.length" @click="writeSingle">写入这一关</button></div></div><details><summary>查看当前单关卡 JSON</summary><pre>{{ JSON.stringify(preview, null, 2) }}</pre></details></section>
    </template>

    <template v-else>
      <section class="mode-intro batch"><b>批量规则与检查</b><span>这里没有“当前第 1 关”设置。先定义范围，生成后再点击某一关单独调整。</span></section>
      <section class="panel batch-settings-panel">
        <div class="panel-head"><div><span>批量范围规则</span><h2>一次生成多关</h2><p>范围规则只影响批量结果，不会改动单关卡编辑页。</p></div><strong>{{ batchStart }}～{{ batchStart + batchCount - 1 }} 关</strong></div>
        <div class="batch-top-fields"><label>批量起始关卡<input v-model.number="batchStart" type="number" min="1"></label><label>生成多少关<input v-model.number="batchCount" type="number" min="1" max="9999"></label><label>批量随机种子<span class="seed-input"><input v-model="batchSeed"><button title="更换批量种子" @click="randomizeBatchSeed">↻</button></span></label></div>
        <label class="check-option"><input v-model="autoDifficulty" type="checkbox">按关卡自动提升难度曲线</label>
        <div class="batch-rule-columns">
          <section class="batch-rule-section"><div class="group-title"><div><h3>难度范围</h3><p>例如 1～10 简单、11～30 普通。</p></div><button class="mini" @click="addRule">＋ 添加范围</button></div><div v-for="rule in rules" :key="rule.id" class="range-rule difficulty-rule"><input v-model.number="rule.start" aria-label="开始关卡" type="number" min="1"><span>—</span><input v-model.number="rule.end" aria-label="结束关卡" type="number" min="1"><select v-model="rule.difficulty" aria-label="难度"><option v-for="(_, key) in DIFFICULTY" :key="key" :value="key">{{ difficultyNames[key] }}</option></select><select v-model.number="rule.matchLength" aria-label="消除数量"><option :value="3">3 消</option><option :value="4">4 消</option><option :value="5">5 消</option></select><button class="delete" @click="rules=rules.filter(item=>item.id!==rule.id)">×</button></div></section>
          <section class="batch-rule-section"><div class="group-title"><div><h3>形状范围</h3><p>每个范围只从勾选形状中随机。</p></div><button class="mini" @click="addShapeRule">＋ 添加形状范围</button></div><div v-for="rule in shapeRules" :key="rule.id" class="shape-rule"><div class="shape-rule-range"><input v-model.number="rule.start" aria-label="形状规则开始关卡" type="number" min="1"><span>—</span><input v-model.number="rule.end" aria-label="形状规则结束关卡" type="number" min="1"><button class="delete" @click="shapeRules=shapeRules.filter(item=>item.id!==rule.id)">×</button></div><div class="shape-pool"><button v-for="shape in SHAPES" :key="shape[0]" :class="{selected:rule.shapes.includes(shape[0])}" @click="toggleRuleShape(rule,shape[0])">{{ shape[1] }}</button></div></div></section>
        </div>
        <div class="batch-actions"><button class="check-batch" @click="runBatchCheck">生成并检查 {{ batchCount }} 关</button><button class="zip" @click="downloadBatchZip">下载批量 ZIP</button><button class="gold" @click="writeBatch">批量写入目录</button></div><p class="notice">{{ notice }}</p>
      </section>
      <section v-if="batchReport.length" class="panel batch-report"><div class="batch-report-title"><div><span>批量检查结果</span><h2>点击任意关卡进行单独设置</h2></div><b>{{ batchReport.filter(item=>!item.issues.some(issue=>issue.severity==='error')).length }} / {{ batchReport.length }} 关通过</b></div><div class="batch-report-grid"><button v-for="item in batchReport" :key="item.level" class="batch-level-card" :class="{bad:item.issues.some(issue=>issue.severity==='error'),warn:item.issues.some(issue=>issue.severity==='warning')}" @click="openBatchLevel(item.level)"><b>第 {{ item.level }} 关 · {{ difficultyNames[item.difficulty] }}</b><span>{{ item.moves }} 步 · {{ item.possibleMoves }} 个合法交换</span><small v-if="!item.issues.length">✓ 通过 · 点击设置</small><small v-for="issue in item.issues" :key="issue.code">{{ issue.severity==='error'?'✕':'!' }} {{ issue.message }}</small></button></div><details><summary>查看全部批量 JSON</summary><pre>{{ JSON.stringify(batchLevels, null, 2) }}</pre></details></section>
    </template>

    <div v-if="batchEditor" class="modal-mask" @click.self="closeBatchEditor">
      <section class="batch-modal" role="dialog" aria-modal="true" :aria-label="`设置第 ${batchEditor.level} 关`">
        <header><div><span>批量结果 · 单关调整</span><h2>设置第 {{ batchEditor.level }} 关</h2><p>保存后只重新生成这一关，其他批量关卡保持不变。</p></div><button class="modal-close" @click="closeBatchEditor">×</button></header>
        <div class="modal-section"><h3>基础规则</h3><div class="modal-fields"><label>难度<select v-model="batchEditor.difficulty"><option v-for="(_,key) in DIFFICULTY" :key="key" :value="key">{{ difficultyNames[key] }}</option></select></label><label>棋盘形状<select v-model="batchEditor.shape"><option v-for="shape in SHAPES" :key="shape[0]" :value="shape[0]">{{ shape[1] }}</option></select></label><label>可移动步数<input v-model.number="batchEditor.moveLimit" type="number" min="5" max="60"></label><label>宝石颜色<input v-model.number="batchEditor.gemTypes" type="number" min="3" max="6"></label><label>消除规则<select v-model.number="batchEditor.matchLength"><option :value="3">3 消</option><option :value="4">4 消</option><option :value="5">5 消</option></select></label></div></div>
        <div class="modal-section"><div class="group-title"><div><h3>关卡目标</h3><p>这里是这一关最终使用的目标。</p></div><button class="mini" @click="addBatchGoal">＋ 添加目标</button></div><div v-for="(goal,index) in batchEditor.goals" :key="index" class="modal-goal"><select v-model="goal.type"><option v-for="item in goalTypes" :key="item[0]" :value="item[0]">{{ item[1] }}</option></select><select v-if="goal.type==='collectGem'" v-model.number="goal.gemType"><option v-for="(name,type) in gemNames.slice(0,batchEditor.gemTypes)" :key="type" :value="type">{{ name }}</option></select><span v-else></span><input v-model.number="goal.count" type="number" min="1"><button class="delete" @click="batchEditor.goals.splice(index,1)">×</button></div><p v-if="!batchEditor.goals.length" class="modal-error">至少保留一个目标。</p></div>
        <div class="modal-columns"><div class="modal-section"><h3>障碍数量</h3><div class="modal-count-grid"><label v-for="item in obstacleFields" :key="item[0]">{{ item[1] }}<input v-model.number="batchEditor[item[0]]" type="number" min="0" max="99"></label></div></div><div class="modal-section"><h3>特殊棋子</h3><div class="modal-count-grid"><label v-for="item in specialFields" :key="item[0]">{{ item[1] }}<input v-model.number="batchEditor[item[0]]" type="number" min="0" max="20"></label></div></div><div class="modal-section"><h3>道具数量</h3><div class="modal-count-grid"><label v-for="item in propFields" :key="item[0]">{{ item[1] }}<input v-model.number="batchEditor[item[0]]" type="number" min="0" :max="item[0]==='infiniteCount'?1:99"></label></div></div></div>
        <footer><button class="ghost" @click="closeBatchEditor">取消</button><button class="save-level" :disabled="!batchEditor.goals.length" @click="saveBatchLevel">保存并重新生成第 {{ batchEditor.level }} 关</button></footer>
      </section>
    </div>
  </main>
</template>
