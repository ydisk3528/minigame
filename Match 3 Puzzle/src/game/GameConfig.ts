export const GameConfig = {
    cellSize: 108,
    tileSize: 96,
    tileInset: 6,
    swapDuration: 120, minSwapDuration: 40, dragReturnDuration: 90, clearDuration: 240,
    fallBaseDuration: 130, fallPerCellDuration: 24, shuffleDuration: 260,
    hintDelay: 5000, swipeThreshold: 28, dragAxisThreshold: 8,
    maxCascade: 20,
    effectPrefabs: {
        burst: "resources/prefabs/effects/MatchBurst.lh",
        beam: "resources/prefabs/effects/SpecialBeam.lh",
        wave: "resources/prefabs/effects/ComboWave.lh",
        comboBanner: "resources/prefabs/effects/ComboBanner.lh",
        goalFly: "resources/prefabs/effects/GoalFly.lh",
        bomb: "resources/prefabs/effects/BombBurst.lh",
        rainbow: "resources/prefabs/effects/RainbowBurst.lh",
    },
    effectTextures: {
        burst: "textures/effects/match_burst.png",
        skillLineTrail: "textures/effects/skill_line_trail.png",
        skillTipArrow: "textures/effects/skill_tip_arrow.png",
        skillTipRange: "textures/effects/skill_tip_range.png",
        hideFrames: Array.from({ length: 8 }, (_, index) =>
            `textures/effects/hide_${String(index + 1).padStart(2, "0")}.png`),
        skillRangeFrames: Array.from({ length: 11 }, (_, index) =>
            `textures/effects/skill_range_${String(index + 1).padStart(2, "0")}.png`),
    },
    propPrefabs: {
        hammer: "resources/prefabs/ui/PropButton.lh",
    },
    firstPlayGuidePrefab: "resources/prefabs/ui/FirstPlayGuide.lh",
    boardPrefabs: {
        cell: "resources/prefabs/ui/BoardCellSlot.lh",
        goal: "resources/prefabs/ui/GoalDisplay.lh",
    },
    gemPrefab: "resources/prefabs/gems/Gem.lh",
    obstaclePrefab: "resources/prefabs/obstacles/Obstacle.lh",
    obstacleTextures: [
        "",
        "textures/common/obstacles/obstacle_ice.png",
        "textures/common/obstacles/obstacle_chain.png",
        "textures/common/obstacles/obstacle_crate.png",
        "textures/common/obstacles/obstacle_stone.png",
    ],
    specialPrefabs: [
        "",
        "resources/prefabs/special/SpecialRocketHorizontal.lh",
        "resources/prefabs/special/SpecialRocketVertical.lh",
        "resources/prefabs/special/SpecialBomb.lh",
        "resources/prefabs/special/SpecialRainbow.lh",
    ],
} as const;
