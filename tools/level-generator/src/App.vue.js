import { computed, ref } from 'vue';
import JSZip from 'jszip';
const BOARD_ROWS = 8;
const BOARD_COLUMNS = 26;
const MAX_LEVEL_COUNT = 10_000;
const MAX_BATCH_COUNT = 10_000;
const MIN_COIN_REWARD = 100;
const MAX_COIN_REWARD = 500;
const shapeNames = [
    '单格', '横二格', '竖二格', '横三格', '竖三格', '横四格', '竖四格',
    '横五格', '竖五格', '2×2 方块', '3×2 矩形', '2×3 矩形', '小 L',
    '镜像小 L', '大 L', '镜像大 L', '正 T', '倒 T', '横 Z', '横 S',
    '竖 Z', '竖 S', '十字', 'U 形', '上三角', '下三角', '空心菱形',
];
const levelId = ref(1);
const selectedMode = ref('match3');
const targetScore = ref(1000);
const autoBalance = ref(true);
const reward = ref(MAX_COIN_REWARD);
const density = ref(100);
const pacing = ref('experience');
const seed = ref(`${Date.now()}`);
const symmetric = ref(true);
const boardPattern = ref('mixed');
const matchLength = ref(4);
const batchCount = ref(10);
const selectedShapes = ref(Array.from({ length: 27 }, (_, index) => index + 1));
const selectedGuaranteedFeatures = ref(['vortex']);
const guaranteedFeatureOptions = [
    { value: 'vortex', label: '黑洞吸附', hint: '初始棋盘必有一步可组成同色 2×2' },
    { value: 'rocketHorizontal', label: '横向火箭', hint: '初始棋盘直接出现一个横向火箭' },
    { value: 'rocketVertical', label: '纵向火箭', hint: '初始棋盘直接出现一个纵向火箭' },
    { value: 'bomb', label: '范围炸弹', hint: '初始棋盘直接出现一个范围炸弹' },
    { value: 'rainbow', label: '彩虹宝石', hint: '初始棋盘直接出现一个彩虹宝石' },
];
const notice = ref('点击棋盘格可以手动开关');
const rangeRules = ref([]);
let nextRuleUid = 1;
const modeForLevel = (id) => {
    void id;
    return selectedMode.value;
};
const currentMode = computed(() => modeForLevel(Math.max(1, Math.floor(levelId.value))));
function selectMode(mode) {
    if (selectedMode.value === mode)
        return;
    selectedMode.value = mode;
    density.value = densityForLevel(levelId.value);
    targetScore.value = targetForLevel(levelId.value);
    grid.value = mode === 'blockPuzzle'
        ? blockBlastGrid()
        : generateGridForLevel(levelId.value, seed.value, density.value);
    notice.value = mode === 'match3'
        ? '已切换到消消乐模式，导出时会包含 match3Config。'
        : '已切换到 Block Blast 模式，导出时只包含方块玩法字段。';
}
const boardColumnsForLevel = (id) => {
    const levelDifficulty = difficultyForLevel(Math.max(1, Math.floor(id)));
    const difficultyColumns = levelDifficulty === 'easy' ? 8 : levelDifficulty === 'normal' ? 10 : 12;
    const progressionColumns = id <= 10 ? 8
        : id <= 50 ? 10
            : id <= 100 ? 12
                : id <= 250 ? 16
                    : id <= 500 ? 20
                        : id <= 750 ? 24 : 26;
    return Math.max(difficultyColumns, progressionColumns);
};
const effectiveBoardColumns = computed(() => boardColumnsForLevel(levelId.value));
const pacingProfiles = {
    quick: { targetMultiplier: 1.5, moveMultiplier: 1 },
    experience: { targetMultiplier: 3, moveMultiplier: 1.25 },
    long: { targetMultiplier: 5, moveMultiplier: 1.55 },
};
const difficultyProfiles = {
    easy: {
        blockDensity: 100,
        matchDensity: 100,
        blockTarget: 400,
        matchTarget: 500,
        blockStep: 50,
        matchStep: 30,
        moveLimit: 42,
        colorCount: 0,
        progressCap: 4,
    },
    normal: {
        blockDensity: 90,
        matchDensity: 96,
        blockTarget: 1400,
        matchTarget: 950,
        blockStep: 80,
        matchStep: 50,
        moveLimit: 32,
        colorCount: 0,
        progressCap: 19,
    },
    hard: {
        blockDensity: 74,
        matchDensity: 88,
        blockTarget: 2600,
        matchTarget: 1600,
        blockStep: 120,
        matchStep: 80,
        moveLimit: 25,
        colorCount: 0,
        progressCap: 24,
    },
};
const EASY_SHAPE_IDS = new Set([1, 2, 3, 4, 5, 6, 7, 10]);
function profileForLevel(id) {
    return difficultyProfiles[difficultyForLevel(id)];
}
function densityForLevel(id) {
    const profile = profileForLevel(id);
    return modeForLevel(id) === 'match3' ? profile.matchDensity : profile.blockDensity;
}
function targetForLevel(id) {
    if (!autoBalance.value && id === Math.floor(levelId.value)) {
        return Math.max(1, Math.floor(targetScore.value));
    }
    const profile = profileForLevel(id);
    const levelDifficulty = difficultyForLevel(id);
    const batchStart = Math.max(1, Math.floor(levelId.value));
    const count = Math.max(1, Math.floor(batchCount.value));
    const inAutoBatch = ruleForLevel(id) === undefined
        && count > 1 && id >= batchStart && id < batchStart + count;
    const difficultyStart = inAutoBatch
        ? levelDifficulty === 'easy' ? batchStart
            : levelDifficulty === 'normal' ? batchStart + Math.ceil(count / 3)
                : batchStart + Math.ceil(count * 2 / 3)
        : levelDifficulty === 'easy' ? 1 : levelDifficulty === 'normal' ? 11 : 51;
    const pairProgress = Math.min(profile.progressCap, Math.max(0, Math.floor((id - difficultyStart) / 2)));
    const baseTarget = modeForLevel(id) === 'match3'
        ? profile.matchTarget + pairProgress * profile.matchStep
        : profile.blockTarget + pairProgress * profile.blockStep;
    return Math.round(baseTarget * pacingProfiles[pacingForLevel(id)].targetMultiplier / 50) * 50;
}
function shapesForLevel(id) {
    const selected = [...selectedShapes.value].sort((a, b) => a - b);
    if (difficultyForLevel(id) !== 'easy' || modeForLevel(id) === 'match3') {
        return selected;
    }
    const easyShapes = selected.filter((shapeId) => EASY_SHAPE_IDS.has(shapeId));
    return easyShapes.length > 0 ? easyShapes : [...EASY_SHAPE_IDS];
}
function matchConfigForLevel(id) {
    const profile = profileForLevel(id);
    const guaranteedFeatures = guaranteedFeaturesForLevel(id);
    return {
        moveLimit: Math.min(99, Math.round(profile.moveLimit * pacingProfiles[pacingForLevel(id)].moveMultiplier)),
        colorCount: profile.colorCount,
        matchLength: ruleForLevel(id)?.matchLength ?? matchLength.value,
        ...(guaranteedFeatures.length === 0 ? {} : { guaranteedFeatures }),
    };
}
function addRangeRule() {
    rangeRules.value.push({
        uid: nextRuleUid++,
        startLevel: 1,
        endLevel: 5,
        difficulty: 'easy',
        pacing: 'experience',
        grantBooster: false,
        boosterType: 'random',
        boosterAmount: 1,
        coinReward: MAX_COIN_REWARD,
        boardPattern: 'mixed',
        matchLength: 4,
        guaranteedFeatures: [],
    });
}
function removeRangeRule(uid) {
    rangeRules.value = rangeRules.value.filter((rule) => rule.uid !== uid);
}
function ruleForLevel(id) {
    return [...rangeRules.value].reverse().find((rule) => id >= Math.min(rule.startLevel, rule.endLevel)
        && id <= Math.max(rule.startLevel, rule.endLevel));
}
function difficultyForLevel(id) {
    const rule = ruleForLevel(id);
    if (rule !== undefined)
        return rule.difficulty;
    const start = Math.max(1, Math.floor(levelId.value));
    const count = Math.max(1, Math.floor(batchCount.value));
    if (count > 1 && id >= start && id < start + count) {
        const progress = (id - start) / count;
        return progress < 1 / 3 ? 'easy' : progress < 2 / 3 ? 'normal' : 'hard';
    }
    return id <= 100 ? 'easy' : id <= 500 ? 'normal' : 'hard';
}
function pacingForLevel(id) {
    return ruleForLevel(id)?.pacing ?? pacing.value;
}
function selectPacing(value) {
    pacing.value = value;
    targetScore.value = targetForLevel(levelId.value);
    const profile = pacingProfiles[value];
    notice.value = value === 'quick'
        ? '快速：适合测试基础流程，目标约为原来的 1.5 倍'
        : value === 'experience'
            ? '体验：容易消除但不会几秒结束，推荐用于体验特殊元素'
            : '耐玩：目标更高、步数更多，适合正式长关卡';
}
function boosterRewardForLevel(id) {
    const rule = ruleForLevel(id);
    if (rule !== undefined) {
        if (!rule.grantBooster)
            return undefined;
        return {
            type: rule.boosterType,
            amount: Math.max(1, Math.floor(rule.boosterAmount)),
        };
    }
    const levelDifficulty = difficultyForLevel(id);
    const random = createRandom(`${seed.value}-auto-booster-${id}`);
    const chance = levelDifficulty === 'easy' ? 0.1 : levelDifficulty === 'normal' ? 0.18 : 0.28;
    if (random() >= chance)
        return undefined;
    if (levelDifficulty === 'easy') {
        return { type: 'hammer', amount: 1 };
    }
    if (levelDifficulty === 'normal') {
        return { type: random() < 0.5 ? 'hammer' : 'bomb', amount: 1 };
    }
    return {
        type: random() < 0.5 ? 'rainbow' : 'bomb',
        amount: random() < 0.12 ? 2 : 1,
    };
}
function coinRewardForLevel(id) {
    const configuredReward = ruleForLevel(id)?.coinReward ?? reward.value;
    const maximum = Math.max(MIN_COIN_REWARD, Math.min(MAX_COIN_REWARD, Math.floor(configuredReward)));
    const random = createRandom(`${seed.value}-coin-${id}`);
    return MIN_COIN_REWARD + Math.floor(random() * (maximum - MIN_COIN_REWARD + 1));
}
function boardPatternForLevel(id) {
    return ruleForLevel(id)?.boardPattern ?? boardPattern.value;
}
function guaranteedFeaturesForLevel(id) {
    if (modeForLevel(id) !== 'match3')
        return [];
    const rule = ruleForLevel(id);
    const source = [
        ...selectedGuaranteedFeatures.value,
        ...(rule?.guaranteedFeatures ?? []),
    ];
    return [...new Set(source)];
}
const emptyGrid = () => Array.from({ length: BOARD_ROWS }, () => Array.from({ length: BOARD_COLUMNS }, () => false));
function playableColumnBounds(id = levelId.value) {
    const count = boardColumnsForLevel(id);
    const first = Math.floor((BOARD_COLUMNS - count) / 2);
    return { first, last: first + count - 1, count };
}
const fullGrid = (id = levelId.value) => {
    const bounds = playableColumnBounds(id);
    return Array.from({ length: BOARD_ROWS }, () => Array.from({ length: BOARD_COLUMNS }, (_, column) => column >= bounds.first && column <= bounds.last));
};
const blockBlastGrid = () => {
    const playableColumns = 8;
    const firstColumn = Math.floor((BOARD_COLUMNS - playableColumns) / 2);
    const lastColumn = firstColumn + playableColumns - 1;
    return Array.from({ length: BOARD_ROWS }, () => Array.from({ length: BOARD_COLUMNS }, (_, column) => column >= firstColumn && column <= lastColumn));
};
const diamondGrid = (id = levelId.value) => {
    const bounds = playableColumnBounds(id);
    const centerColumn = (bounds.first + bounds.last) / 2;
    return Array.from({ length: BOARD_ROWS }, (_, row) => Array.from({ length: BOARD_COLUMNS }, (_, column) => column >= bounds.first && column <= bounds.last
        && Math.abs(row - 3.5) + Math.abs(column - centerColumn) * (8 / bounds.count) <= 4));
};
const roundedGrid = (id = levelId.value) => {
    const bounds = playableColumnBounds(id);
    return Array.from({ length: BOARD_ROWS }, (_, row) => Array.from({ length: BOARD_COLUMNS }, (_, column) => {
        if (column < bounds.first || column > bounds.last)
            return false;
        const outerRow = row === 0 || row === BOARD_ROWS - 1;
        const outerColumn = column === bounds.first || column === bounds.last;
        return !(outerRow && outerColumn);
    }));
};
const crossGrid = (id = levelId.value) => {
    const bounds = playableColumnBounds(id);
    const centerColumn = (bounds.first + bounds.last) / 2;
    return Array.from({ length: BOARD_ROWS }, (_, row) => Array.from({ length: BOARD_COLUMNS }, (_, column) => column >= bounds.first && column <= bounds.last
        && ((row >= 2 && row <= 5) || Math.abs(column - centerColumn) <= 1.5)));
};
const hourglassGrid = (id = levelId.value) => {
    const bounds = playableColumnBounds(id);
    const centerColumn = (bounds.first + bounds.last) / 2;
    return Array.from({ length: BOARD_ROWS }, (_, row) => Array.from({ length: BOARD_COLUMNS }, (_, column) => {
        if (column < bounds.first || column > bounds.last)
            return false;
        const halfWidth = Math.max(2, Math.floor(bounds.count * (0.18 + Math.abs(row - 3.5) * 0.035)));
        return Math.abs(column - centerColumn) <= halfWidth;
    }));
};
const hShapeGrid = (id = levelId.value) => {
    const bounds = playableColumnBounds(id);
    return Array.from({ length: BOARD_ROWS }, (_, row) => Array.from({ length: BOARD_COLUMNS }, (_, column) => {
        if (column < bounds.first || column > bounds.last)
            return false;
        const sideWidth = Math.max(2, Math.floor(bounds.count * 0.16));
        const side = column < bounds.first + sideWidth || column > bounds.last - sideWidth;
        return side || row === 3 || row === 4;
    }));
};
const stairsGrid = (id = levelId.value) => {
    const bounds = playableColumnBounds(id);
    const width = Math.max(6, Math.round(bounds.count * 0.62));
    const maxShift = Math.max(0, bounds.count - width);
    return Array.from({ length: BOARD_ROWS }, (_, row) => {
        const shift = Math.round(maxShift * row / (BOARD_ROWS - 1));
        return Array.from({ length: BOARD_COLUMNS }, (_, column) => column >= bounds.first + shift && column < bounds.first + shift + width);
    });
};
// This preset deliberately uses the whole landscape board so both islands stay
// large enough for legal 4-gem matches, even when the level difficulty is easy.
const doubleIslandGrid = () => {
    const leftFirst = 0;
    const leftLast = 7;
    const rightCenterColumn = 20;
    return Array.from({ length: BOARD_ROWS }, (_, row) => Array.from({ length: BOARD_COLUMNS }, (_, column) => {
        const leftSquare = row >= 2 && row <= 5
            && column >= leftFirst && column <= leftLast;
        const rightDiamond = Math.abs(row - 3.5)
            + Math.abs(column - rightCenterColumn) * 0.48 <= 3.6;
        return leftSquare || rightDiamond;
    }));
};
const doubleDiamondGrid = () => {
    const centers = [6, 19];
    return Array.from({ length: BOARD_ROWS }, (_, row) => Array.from({ length: BOARD_COLUMNS }, (_, column) => centers.some((center) => Math.abs(row - 3.5) + Math.abs(column - center) * 0.62 <= 3.2)));
};
const wingsGrid = () => {
    return Array.from({ length: BOARD_ROWS }, (_, row) => Array.from({ length: BOARD_COLUMNS }, (_, column) => {
        const inset = Math.floor(Math.abs(row - 3.5) / 2);
        const leftWing = column >= inset && column <= 8;
        const rightWing = column >= 17 && column <= 25 - inset;
        return leftWing || rightWing;
    }));
};
function presetGrid(pattern, id = levelId.value) {
    if (pattern === 'full')
        return fullGrid(id);
    if (pattern === 'diamond')
        return diamondGrid(id);
    if (pattern === 'rounded')
        return roundedGrid(id);
    if (pattern === 'cross')
        return crossGrid(id);
    if (pattern === 'hourglass')
        return hourglassGrid(id);
    if (pattern === 'hShape')
        return hShapeGrid(id);
    if (pattern === 'stairs')
        return stairsGrid(id);
    if (pattern === 'doubleIsland')
        return doubleIslandGrid();
    if (pattern === 'doubleDiamond')
        return doubleDiamondGrid();
    if (pattern === 'wings')
        return wingsGrid();
    return null;
}
const PRESET_PATTERNS = [
    'full', 'diamond', 'rounded', 'cross', 'hourglass',
    'hShape', 'stairs', 'doubleIsland', 'doubleDiamond', 'wings',
];
const grid = ref(generateGridForLevel(levelId.value, seed.value, density.value));
function hashSeed(value) {
    let hash = 2166136261;
    for (const character of value) {
        hash ^= character.charCodeAt(0);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}
function createRandom(seedText) {
    let state = hashSeed(seedText) || 1;
    return () => {
        state ^= state << 13;
        state ^= state >>> 17;
        state ^= state << 5;
        return (state >>> 0) / 4294967296;
    };
}
function generateConnectedGrid(seedText, densityPercent = density.value, id = levelId.value) {
    const random = createRandom(seedText);
    const result = emptyGrid();
    const bounds = playableColumnBounds(id);
    const playableCellCount = BOARD_ROWS * bounds.count;
    const target = Math.min(playableCellCount, Math.max(Math.min(12, playableCellCount), Math.round(playableCellCount * densityPercent / 100)));
    const active = new Set();
    const isInsidePlayableArea = (row, column) => row >= 0 && row < BOARD_ROWS && column >= bounds.first && column <= bounds.last;
    const add = (row, column) => {
        if (!isInsidePlayableArea(row, column))
            return;
        result[row][column] = true;
        active.add(`${row}:${column}`);
        if (symmetric.value) {
            const mirrorColumn = bounds.first + bounds.last - column;
            result[row][mirrorColumn] = true;
            active.add(`${row}:${mirrorColumn}`);
        }
    };
    const centerColumn = Math.floor((bounds.first + bounds.last) / 2);
    add(3, centerColumn);
    add(4, centerColumn);
    while (active.size < target) {
        const frontier = new Map();
        for (const key of active) {
            const [row, column] = key.split(':').map(Number);
            for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
                const nextRow = row + dr;
                const nextColumn = column + dc;
                const nextKey = `${nextRow}:${nextColumn}`;
                if (isInsidePlayableArea(nextRow, nextColumn) && !active.has(nextKey)) {
                    frontier.set(nextKey, [nextRow, nextColumn]);
                }
            }
        }
        const candidates = [...frontier.values()];
        if (candidates.length === 0)
            break;
        const [row, column] = candidates[Math.floor(random() * candidates.length)];
        add(row, column);
    }
    return result;
}
function generateGridForLevel(id, seedText, densityPercent = densityForLevel(id)) {
    let pattern = boardPatternForLevel(id);
    const presetOffset = hashSeed(`${seed.value}-preset-order`) % PRESET_PATTERNS.length;
    const rotatingPreset = PRESET_PATTERNS[(presetOffset + Math.max(0, id - 1)) % PRESET_PATTERNS.length];
    if (pattern === 'presetRandom') {
        // Seeded rotation prevents a late batch from degenerating into repeated
        // rectangles while remaining reproducible for the same seed.
        pattern = rotatingPreset;
    }
    else if (pattern === 'mixed') {
        pattern = id % 11 === 0 ? 'connected' : rotatingPreset;
    }
    const preset = presetGrid(pattern, id);
    if (preset !== null)
        return preset;
    return generateConnectedGrid(seedText, densityPercent, id);
}
function applyPreset(type) {
    grid.value = presetGrid(type) ?? generateConnectedGrid(seed.value);
    notice.value = '预设已应用，可以继续点击微调';
}
function randomize() {
    grid.value = generateGridForLevel(levelId.value, seed.value, density.value);
    notice.value = `已按种子 ${seed.value} 生成`;
}
function newSeedAndRandomize() {
    seed.value = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    randomize();
}
function generateCurrentLevel() {
    density.value = densityForLevel(levelId.value);
    targetScore.value = targetForLevel(levelId.value);
    newSeedAndRandomize();
    if (currentMode.value === 'blockPuzzle')
        grid.value = blockBlastGrid();
    const modeName = currentMode.value === 'match3' ? '消消乐' : 'Block Blast';
    notice.value = `已生成第 ${levelId.value} 关 · ${modeName} · ${difficultyForLevel(levelId.value)}`;
}
function toggleCell(row, column) {
    grid.value[row][column] = !grid.value[row][column];
    grid.value = grid.value.map((line) => [...line]);
}
const boardMask = computed(() => grid.value.map((row) => row.map((active) => active ? '1' : '0').join('')));
const activeCount = computed(() => grid.value.flat().filter(Boolean).length);
function previewColor(row, column) {
    if (currentMode.value !== 'match3' || !grid.value[row][column])
        return undefined;
    const palette = ['#44b9ff', '#4ce39d', '#ffda46', '#ff8747', '#b566ff', '#ff67ba'];
    const count = matchConfigForLevel(levelId.value).colorCount || palette.length;
    return palette[(hashSeed(seed.value) + row * 11 + column * 17) % count];
}
const regionCount = computed(() => {
    const visited = new Set();
    let regions = 0;
    for (let row = 0; row < BOARD_ROWS; row += 1) {
        for (let column = 0; column < BOARD_COLUMNS; column += 1) {
            const startKey = `${row}:${column}`;
            if (!grid.value[row][column] || visited.has(startKey))
                continue;
            regions += 1;
            const queue = [[row, column]];
            visited.add(startKey);
            for (let cursor = 0; cursor < queue.length; cursor += 1) {
                const [currentRow, currentColumn] = queue[cursor];
                for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
                    const nextRow = currentRow + dr;
                    const nextColumn = currentColumn + dc;
                    const key = `${nextRow}:${nextColumn}`;
                    if (nextRow >= 0 && nextRow < BOARD_ROWS
                        && nextColumn >= 0 && nextColumn < BOARD_COLUMNS
                        && grid.value[nextRow][nextColumn] && !visited.has(key)) {
                        visited.add(key);
                        queue.push([nextRow, nextColumn]);
                    }
                }
            }
        }
    }
    return regions;
});
const isConnected = computed(() => regionCount.value === 1);
const levelJson = computed(() => ({
    id: Math.max(1, Math.min(MAX_LEVEL_COUNT, Math.floor(levelId.value))),
    gameMode: currentMode.value,
    difficulty: difficultyForLevel(levelId.value),
    targetScore: targetForLevel(levelId.value),
    availableShapes: shapesForLevel(levelId.value),
    reward: coinRewardForLevel(levelId.value),
    boardMask: boardMask.value,
    ...(boosterRewardForLevel(levelId.value) === undefined
        ? {}
        : { boosterReward: boosterRewardForLevel(levelId.value) }),
    ...(currentMode.value === 'match3' ? {
        match3Config: matchConfigForLevel(levelId.value),
    } : {}),
}));
const jsonText = computed(() => JSON.stringify(levelJson.value, null, 2));
const shortLines = computed(() => {
    const rows = grid.value
        .map((row, index) => ({ axis: `第 ${index + 1} 行`, count: row.filter(Boolean).length }))
        .filter((line) => line.count > 0 && line.count < 3);
    const columns = Array.from({ length: BOARD_COLUMNS }, (_, column) => ({
        axis: `第 ${column + 1} 列`,
        count: grid.value.reduce((sum, row) => sum + (row[column] ? 1 : 0), 0),
    })).filter((line) => line.count > 0 && line.count < 3);
    return [...rows, ...columns];
});
const fileName = (id) => `level_${String(id).padStart(3, '0')}.json`;
function downloadBlob(name, blob) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = name;
    link.click();
    URL.revokeObjectURL(link.href);
}
function downloadCurrent() {
    downloadBlob(fileName(levelJson.value.id), new Blob([jsonText.value], { type: 'application/json' }));
    notice.value = `${fileName(levelJson.value.id)} 已下载`;
}
async function copyJson() {
    await navigator.clipboard.writeText(jsonText.value);
    notice.value = 'JSON 已复制到剪贴板';
}
async function downloadBatch(mode) {
    const originalMode = selectedMode.value;
    if (mode !== 'mixed')
        selectedMode.value = mode;
    const zip = new JSZip();
    const requestedCount = Math.max(1, Math.floor(batchCount.value));
    const startId = Math.max(1, Math.min(MAX_LEVEL_COUNT, levelJson.value.id));
    const count = Math.min(MAX_BATCH_COUNT, requestedCount, MAX_LEVEL_COUNT - startId + 1);
    for (let index = 0; index < count; index += 1) {
        const id = startId + index;
        const levelMode = mode === 'mixed'
            ? id % 2 === 0 ? 'blockPuzzle' : 'match3'
            : mode;
        selectedMode.value = levelMode;
        const levelDifficulty = difficultyForLevel(id);
        const generatedGrid = levelMode === 'blockPuzzle'
            ? blockBlastGrid()
            : generateGridForLevel(id, `${seed.value}-${id}`, densityForLevel(id));
        const mask = generatedGrid.map((row) => row.map((active) => active ? '1' : '0').join(''));
        const data = {
            ...levelJson.value,
            id,
            gameMode: modeForLevel(id),
            difficulty: levelDifficulty,
            targetScore: targetForLevel(id),
            availableShapes: shapesForLevel(id),
            reward: coinRewardForLevel(id),
            boardMask: mask,
        };
        const boosterReward = boosterRewardForLevel(id);
        if (boosterReward === undefined) {
            delete data.boosterReward;
        }
        else {
            data.boosterReward = boosterReward;
        }
        if (data.gameMode === 'match3') {
            data.match3Config = matchConfigForLevel(id);
        }
        else {
            delete data.match3Config;
        }
        zip.file(fileName(id), JSON.stringify(data, null, 2));
    }
    selectedMode.value = mode === 'mixed' ? originalMode : mode;
    const zipName = mode === 'mixed' ? 'blockblast-levels-mixed.zip' : 'blockblast-levels.zip';
    downloadBlob(zipName, await zip.generateAsync({ type: 'blob' }));
    const modeName = mode === 'mixed' ? '奇偶混合模式' : mode === 'match3' ? '消消乐' : 'Block Blast';
    notice.value = `${count} 个${modeName}关卡已打包下载（${startId} - ${startId + count - 1}）`;
}
function toggleAllShapes() {
    selectedShapes.value = selectedShapes.value.length === shapeNames.length
        ? []
        : Array.from({ length: shapeNames.length }, (_, index) => index + 1);
}
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.main, __VLS_intrinsics.main)({
    ...{ class: "app-shell" },
});
/** @type {__VLS_StyleScopedClasses['app-shell']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.header, __VLS_intrinsics.header)({
    ...{ class: "hero" },
});
/** @type {__VLS_StyleScopedClasses['hero']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "eyebrow" },
});
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "subtitle" },
});
/** @type {__VLS_StyleScopedClasses['subtitle']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "status-pill" },
});
/** @type {__VLS_StyleScopedClasses['status-pill']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
(__VLS_ctx.activeCount);
(__VLS_ctx.effectiveBoardColumns);
__VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
    ...{ class: "workspace" },
});
/** @type {__VLS_StyleScopedClasses['workspace']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({
    ...{ class: "panel board-panel" },
});
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['board-panel']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "panel-title" },
});
/** @type {__VLS_StyleScopedClasses['panel-title']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "health" },
});
/** @type {__VLS_StyleScopedClasses['health']} */ ;
(__VLS_ctx.isConnected ? '单一区域' : `${__VLS_ctx.regionCount} 个独立区域`);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "board-wrap" },
});
/** @type {__VLS_StyleScopedClasses['board-wrap']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "board" },
    role: "grid",
    'aria-label': "12乘8棋盘编辑器",
});
/** @type {__VLS_StyleScopedClasses['board']} */ ;
for (const [_, index] of __VLS_vFor((__VLS_ctx.BOARD_ROWS * __VLS_ctx.BOARD_COLUMNS))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                return (__VLS_ctx.toggleCell(Math.floor(index / __VLS_ctx.BOARD_COLUMNS), index % __VLS_ctx.BOARD_COLUMNS));
                // @ts-ignore
                [activeCount, effectiveBoardColumns, isConnected, regionCount, BOARD_ROWS, BOARD_COLUMNS, BOARD_COLUMNS, BOARD_COLUMNS, toggleCell,];
            } },
        key: (index),
        ...{ class: "cell" },
        ...{ class: ({ active: __VLS_ctx.grid[Math.floor(index / __VLS_ctx.BOARD_COLUMNS)][index % __VLS_ctx.BOARD_COLUMNS] }) },
        ...{ style: ({ background: __VLS_ctx.previewColor(Math.floor(index / __VLS_ctx.BOARD_COLUMNS), index % __VLS_ctx.BOARD_COLUMNS) }) },
        'aria-label': (`第 ${Math.floor(index / __VLS_ctx.BOARD_COLUMNS) + 1} 行第 ${index % __VLS_ctx.BOARD_COLUMNS + 1} 列`),
    });
    /** @type {__VLS_StyleScopedClasses['cell']} */ ;
    /** @type {__VLS_StyleScopedClasses['active']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({});
    // @ts-ignore
    [BOARD_COLUMNS, BOARD_COLUMNS, BOARD_COLUMNS, BOARD_COLUMNS, BOARD_COLUMNS, BOARD_COLUMNS, grid, previewColor,];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "preset-row" },
});
/** @type {__VLS_StyleScopedClasses['preset-row']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            return (__VLS_ctx.applyPreset('full'));
            // @ts-ignore
            [applyPreset,];
        } },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            return (__VLS_ctx.applyPreset('diamond'));
            // @ts-ignore
            [applyPreset,];
        } },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            return (__VLS_ctx.applyPreset('rounded'));
            // @ts-ignore
            [applyPreset,];
        } },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            return (__VLS_ctx.applyPreset('cross'));
            // @ts-ignore
            [applyPreset,];
        } },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            return (__VLS_ctx.applyPreset('hourglass'));
            // @ts-ignore
            [applyPreset,];
        } },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            return (__VLS_ctx.applyPreset('hShape'));
            // @ts-ignore
            [applyPreset,];
        } },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            return (__VLS_ctx.applyPreset('stairs'));
            // @ts-ignore
            [applyPreset,];
        } },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            return (__VLS_ctx.applyPreset('doubleIsland'));
            // @ts-ignore
            [applyPreset,];
        } },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            return (__VLS_ctx.applyPreset('doubleDiamond'));
            // @ts-ignore
            [applyPreset,];
        } },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            return (__VLS_ctx.applyPreset('wings'));
            // @ts-ignore
            [applyPreset,];
        } },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "notice" },
});
/** @type {__VLS_StyleScopedClasses['notice']} */ ;
(__VLS_ctx.notice);
if (__VLS_ctx.shortLines.length) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "warning" },
    });
    /** @type {__VLS_StyleScopedClasses['warning']} */ ;
    (__VLS_ctx.shortLines.map(line => `${line.axis}仅${line.count}格`).join('、'));
}
__VLS_asFunctionalElement1(__VLS_intrinsics.aside, __VLS_intrinsics.aside)({
    ...{ class: "panel controls-panel" },
});
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['controls-panel']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "panel-title" },
});
/** @type {__VLS_StyleScopedClasses['panel-title']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "mode-selector" },
    role: "group",
    'aria-label': "关卡模式",
});
/** @type {__VLS_StyleScopedClasses['mode-selector']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            return (__VLS_ctx.selectMode('blockPuzzle'));
            // @ts-ignore
            [notice, shortLines, shortLines, selectMode,];
        } },
    ...{ class: ({ selected: __VLS_ctx.currentMode === 'blockPuzzle' }) },
});
/** @type {__VLS_StyleScopedClasses['selected']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            return (__VLS_ctx.selectMode('match3'));
            // @ts-ignore
            [selectMode, currentMode,];
        } },
    ...{ class: ({ selected: __VLS_ctx.currentMode === 'match3' }) },
});
/** @type {__VLS_StyleScopedClasses['selected']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "mode-card" },
    ...{ class: (__VLS_ctx.currentMode) },
});
/** @type {__VLS_StyleScopedClasses['mode-card']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
(__VLS_ctx.levelId);
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
(__VLS_ctx.currentMode === 'match3' ? '消消乐模式' : 'Block Blast 模式');
__VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
(__VLS_ctx.currentMode === 'match3' ? '交换相邻宝石 · 连色消除' : '拖放方块 · 填满整行或整列消除');
if (__VLS_ctx.currentMode === 'match3') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "match-summary" },
    });
    /** @type {__VLS_StyleScopedClasses['match-summary']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.b, __VLS_intrinsics.b)({});
    (__VLS_ctx.matchConfigForLevel(__VLS_ctx.levelId).colorCount || '全部');
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.b, __VLS_intrinsics.b)({});
    (__VLS_ctx.matchConfigForLevel(__VLS_ctx.levelId).moveLimit);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.b, __VLS_intrinsics.b)({});
    (__VLS_ctx.matchConfigForLevel(__VLS_ctx.levelId).matchLength);
}
if (__VLS_ctx.currentMode === 'match3') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "feature-section" },
    });
    /** @type {__VLS_StyleScopedClasses['feature-section']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "feature-heading" },
    });
    /** @type {__VLS_StyleScopedClasses['feature-heading']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
    for (const [option] of __VLS_vFor((__VLS_ctx.guaranteedFeatureOptions))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
            key: (option.value),
            ...{ class: "feature-option" },
            ...{ class: ({ selected: __VLS_ctx.selectedGuaranteedFeatures.includes(option.value) }) },
        });
        /** @type {__VLS_StyleScopedClasses['feature-option']} */ ;
        /** @type {__VLS_StyleScopedClasses['selected']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
            type: "checkbox",
            value: (option.value),
        });
        (__VLS_ctx.selectedGuaranteedFeatures);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.b, __VLS_intrinsics.b)({});
        (option.label);
        __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
        (option.hint);
        // @ts-ignore
        [currentMode, currentMode, currentMode, currentMode, currentMode, currentMode, levelId, levelId, levelId, levelId, matchConfigForLevel, matchConfigForLevel, matchConfigForLevel, guaranteedFeatureOptions, selectedGuaranteedFeatures, selectedGuaranteedFeatures,];
    }
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "difficulty-block pacing-block" },
});
/** @type {__VLS_StyleScopedClasses['difficulty-block']} */ ;
/** @type {__VLS_StyleScopedClasses['pacing-block']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "control-caption" },
});
/** @type {__VLS_StyleScopedClasses['control-caption']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "difficulty-buttons" },
});
/** @type {__VLS_StyleScopedClasses['difficulty-buttons']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            return (__VLS_ctx.selectPacing('quick'));
            // @ts-ignore
            [selectPacing,];
        } },
    ...{ class: ({ selected: __VLS_ctx.pacing === 'quick' }) },
});
/** @type {__VLS_StyleScopedClasses['selected']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            return (__VLS_ctx.selectPacing('experience'));
            // @ts-ignore
            [selectPacing, pacing,];
        } },
    ...{ class: ({ selected: __VLS_ctx.pacing === 'experience' }) },
});
/** @type {__VLS_StyleScopedClasses['selected']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            return (__VLS_ctx.selectPacing('long'));
            // @ts-ignore
            [selectPacing, pacing,];
        } },
    ...{ class: ({ selected: __VLS_ctx.pacing === 'long' }) },
});
/** @type {__VLS_StyleScopedClasses['selected']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({
    ...{ class: "pacing-hint" },
});
/** @type {__VLS_StyleScopedClasses['pacing-hint']} */ ;
(__VLS_ctx.pacingProfiles[__VLS_ctx.pacing].targetMultiplier);
if (__VLS_ctx.currentMode === 'match3') {
    (__VLS_ctx.pacingProfiles[__VLS_ctx.pacing].moveMultiplier);
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "range-section" },
});
/** @type {__VLS_StyleScopedClasses['range-section']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "range-heading" },
});
/** @type {__VLS_StyleScopedClasses['range-heading']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.addRangeRule) },
});
if (__VLS_ctx.rangeRules.length === 0) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "empty-rules" },
    });
    /** @type {__VLS_StyleScopedClasses['empty-rules']} */ ;
}
for (const [rule] of __VLS_vFor((__VLS_ctx.rangeRules))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        key: (rule.uid),
        ...{ class: "range-rule" },
    });
    /** @type {__VLS_StyleScopedClasses['range-rule']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "range-line" },
    });
    /** @type {__VLS_StyleScopedClasses['range-line']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        type: "number",
        min: "1",
        max: (__VLS_ctx.MAX_LEVEL_COUNT),
    });
    (rule.startLevel);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        type: "number",
        min: "1",
        max: (__VLS_ctx.MAX_LEVEL_COUNT),
    });
    (rule.endLevel);
    __VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
        value: (rule.difficulty),
        'aria-label': "范围难度",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        value: "easy",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        value: "normal",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        value: "hard",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
        value: (rule.pacing),
        'aria-label': "范围时长",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        value: "quick",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        value: "experience",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        value: "long",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                return (__VLS_ctx.removeRangeRule(rule.uid));
                // @ts-ignore
                [currentMode, pacing, pacing, pacing, pacingProfiles, pacingProfiles, addRangeRule, rangeRules, rangeRules, MAX_LEVEL_COUNT, MAX_LEVEL_COUNT, removeRangeRule,];
            } },
        ...{ class: "delete-rule" },
    });
    /** @type {__VLS_StyleScopedClasses['delete-rule']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "reward-line" },
    });
    /** @type {__VLS_StyleScopedClasses['reward-line']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        type: "number",
        min: "100",
        max: "500",
        step: "10",
    });
    (rule.coinReward);
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
        ...{ class: "reward-check" },
    });
    /** @type {__VLS_StyleScopedClasses['reward-check']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        type: "checkbox",
    });
    (rule.grantBooster);
    if (rule.grantBooster) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
            value: (rule.boosterType),
            'aria-label': "奖励道具",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
            value: "random",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
            value: "all",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
            value: "bomb",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
            value: "hammer",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
            value: "rainbow",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
            type: "number",
            min: "1",
            max: "9",
        });
        (rule.boosterAmount);
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "range-features" },
    });
    /** @type {__VLS_StyleScopedClasses['range-features']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
        value: (rule.boardPattern),
        'aria-label': "范围棋盘类型",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        value: "mixed",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        value: "connected",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        value: "presetRandom",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        value: "diamond",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        value: "cross",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        value: "rounded",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        value: "hourglass",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        value: "hShape",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        value: "stairs",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        value: "doubleIsland",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        value: "doubleDiamond",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        value: "wings",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        value: "full",
    });
    if (__VLS_ctx.currentMode === 'match3') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    }
    if (__VLS_ctx.currentMode === 'match3') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
            value: (rule.matchLength),
            'aria-label': "范围基础连消数量",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
            value: (3),
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
            value: (4),
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
            value: (5),
        });
    }
    if (__VLS_ctx.currentMode === 'match3') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    }
    if (__VLS_ctx.currentMode === 'match3') {
        for (const [option] of __VLS_vFor((__VLS_ctx.guaranteedFeatureOptions))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                key: (option.value),
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                type: "checkbox",
                value: (option.value),
            });
            (rule.guaranteedFeatures);
            (option.label);
            // @ts-ignore
            [currentMode, currentMode, currentMode, currentMode, guaranteedFeatureOptions,];
        }
    }
    // @ts-ignore
    [];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "field-grid" },
});
/** @type {__VLS_StyleScopedClasses['field-grid']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    type: "number",
    min: "1",
    max: (__VLS_ctx.MAX_LEVEL_COUNT),
});
(__VLS_ctx.levelId);
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    type: "number",
    min: "1",
    step: "50",
    disabled: (__VLS_ctx.autoBalance),
});
(__VLS_ctx.targetScore);
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    type: "number",
    min: "100",
    max: "500",
    step: "10",
});
(__VLS_ctx.reward);
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    type: "number",
    min: "1",
    max: (__VLS_ctx.MAX_BATCH_COUNT),
});
(__VLS_ctx.batchCount);
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
    ...{ class: "reward-check auto-balance" },
});
/** @type {__VLS_StyleScopedClasses['reward-check']} */ ;
/** @type {__VLS_StyleScopedClasses['auto-balance']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    type: "checkbox",
});
(__VLS_ctx.autoBalance);
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
    ...{ class: "wide-field" },
});
/** @type {__VLS_StyleScopedClasses['wide-field']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    value: (__VLS_ctx.seed),
    type: "text",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
    ...{ class: "wide-field" },
});
/** @type {__VLS_StyleScopedClasses['wide-field']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
    value: (__VLS_ctx.boardPattern),
});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: "mixed",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: "connected",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: "presetRandom",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: "diamond",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: "cross",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: "rounded",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: "hourglass",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: "hShape",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: "stairs",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: "doubleIsland",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: "doubleDiamond",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: "wings",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
    value: "full",
});
if (__VLS_ctx.currentMode === 'match3') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
        ...{ class: "wide-field" },
    });
    /** @type {__VLS_StyleScopedClasses['wide-field']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
        value: (__VLS_ctx.matchLength),
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        value: (3),
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        value: (4),
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        value: (5),
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
}
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
    ...{ class: "slider-label" },
});
/** @type {__VLS_StyleScopedClasses['slider-label']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.b, __VLS_intrinsics.b)({});
(__VLS_ctx.density);
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    type: "range",
    min: "25",
    max: "100",
});
(__VLS_ctx.density);
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
    ...{ class: "switch-row" },
});
/** @type {__VLS_StyleScopedClasses['switch-row']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    type: "checkbox",
});
(__VLS_ctx.symmetric);
__VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)({});
if (__VLS_ctx.currentMode === 'blockPuzzle') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "shape-section" },
    });
    /** @type {__VLS_StyleScopedClasses['shape-section']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "shape-head" },
    });
    /** @type {__VLS_StyleScopedClasses['shape-head']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({});
    (__VLS_ctx.selectedShapes.length);
    (__VLS_ctx.shapeNames.length);
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.toggleAllShapes) },
    });
    (__VLS_ctx.selectedShapes.length === __VLS_ctx.shapeNames.length ? '清空' : '全选');
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "shape-list" },
    });
    /** @type {__VLS_StyleScopedClasses['shape-list']} */ ;
    for (const [name, index] of __VLS_vFor((__VLS_ctx.shapeNames))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
            key: (index),
            ...{ class: ({ checked: __VLS_ctx.selectedShapes.includes(index + 1) }) },
        });
        /** @type {__VLS_StyleScopedClasses['checked']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
            type: "checkbox",
            value: (index + 1),
        });
        (__VLS_ctx.selectedShapes);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        (index + 1);
        (name);
        // @ts-ignore
        [currentMode, currentMode, levelId, MAX_LEVEL_COUNT, autoBalance, autoBalance, targetScore, reward, MAX_BATCH_COUNT, batchCount, seed, boardPattern, matchLength, density, density, symmetric, selectedShapes, selectedShapes, selectedShapes, selectedShapes, shapeNames, shapeNames, shapeNames, toggleAllShapes,];
    }
    if (__VLS_ctx.selectedShapes.length === 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "warning" },
        });
        /** @type {__VLS_StyleScopedClasses['warning']} */ ;
    }
}
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "control-caption" },
});
/** @type {__VLS_StyleScopedClasses['control-caption']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.generateCurrentLevel) },
    ...{ class: "generate-main" },
});
/** @type {__VLS_StyleScopedClasses['generate-main']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.b, __VLS_intrinsics.b)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.randomize) },
    ...{ class: "seed-replay" },
});
/** @type {__VLS_StyleScopedClasses['seed-replay']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
    ...{ class: "panel export-panel" },
});
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['export-panel']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "panel-title" },
});
/** @type {__VLS_StyleScopedClasses['panel-title']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "export-actions" },
});
/** @type {__VLS_StyleScopedClasses['export-actions']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.copyJson) },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.downloadCurrent) },
    ...{ class: "primary" },
    disabled: (__VLS_ctx.activeCount < 3 || __VLS_ctx.selectedShapes.length === 0),
});
/** @type {__VLS_StyleScopedClasses['primary']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            return (__VLS_ctx.downloadBatch('blockPuzzle'));
            // @ts-ignore
            [activeCount, selectedShapes, selectedShapes, generateCurrentLevel, randomize, copyJson, downloadCurrent, downloadBatch,];
        } },
    ...{ class: "block-batch" },
    disabled: (__VLS_ctx.selectedShapes.length === 0),
});
/** @type {__VLS_StyleScopedClasses['block-batch']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            return (__VLS_ctx.downloadBatch('match3'));
            // @ts-ignore
            [selectedShapes, downloadBatch,];
        } },
    ...{ class: "gold" },
    disabled: (__VLS_ctx.selectedShapes.length === 0),
});
/** @type {__VLS_StyleScopedClasses['gold']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            return (__VLS_ctx.downloadBatch('mixed'));
            // @ts-ignore
            [selectedShapes, downloadBatch,];
        } },
    ...{ class: "mixed-batch" },
    disabled: (__VLS_ctx.selectedShapes.length === 0),
});
/** @type {__VLS_StyleScopedClasses['mixed-batch']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.pre, __VLS_intrinsics.pre)({});
(__VLS_ctx.jsonText);
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "path-hint" },
});
/** @type {__VLS_StyleScopedClasses['path-hint']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.code, __VLS_intrinsics.code)({});
// @ts-ignore
[selectedShapes, jsonText,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
